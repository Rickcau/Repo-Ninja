import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOctokit, getRepoTree, getFileContent } from "@/lib/github/octokit";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildAuditPrompt } from "@/lib/copilot-sdk/prompts";
import type { AuditReport } from "@/lib/types";
import { nanoid } from "nanoid";
import { saveReport } from "../report-store";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import { taskRunner } from "@/lib/services/task-runner";

const KEY_FILES = [
  "package.json", "tsconfig.json", ".eslintrc.json", "eslint.config.js",
  "eslint.config.mjs", ".prettierrc", ".prettierrc.json", "Dockerfile",
  "docker-compose.yml", "docker-compose.yaml", ".github/workflows/ci.yml",
  ".github/workflows/ci.yaml", ".github/dependabot.yml", "jest.config.ts",
  "jest.config.js", "vitest.config.ts", "README.md", ".env.example",
  "next.config.ts", "next.config.js", "next.config.mjs",
];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { repo: string };

  if (!body.repo) {
    return NextResponse.json({ error: "Missing required field: repo" }, { status: 400 });
  }

  const [owner, repo] = body.repo.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repo format. Use owner/repo" }, { status: 400 });
  }

  const auditId = nanoid();
  const accessToken = session.accessToken;
  const userEmail = session.user?.email ?? undefined;

  const initialReport: AuditReport & { status: string } = {
    id: auditId,
    repo: body.repo,
    complianceScore: 0,
    checks: [],
    recommendations: [],
    createdAt: new Date().toISOString(),
    status: "running",
  };
  await saveReport(auditId, initialReport);

  taskRunner.enqueue(auditId, async () => {
    const workId = await logWorkStart(userEmail, "best-practices-audit", body.repo, `Best practices audit: ${body.repo}`, auditId);

    try {
      const octokit = getOctokit(accessToken);
      const tree = await getRepoTree(octokit, owner, repo, "HEAD");
      const structureSummary = tree.slice(0, 100).join("\n");

      if (taskRunner.isCancelled(auditId)) return;

      const keyFileContents: string[] = [];
      for (const filePath of KEY_FILES) {
        if (tree.includes(filePath)) {
          try {
            const content = await getFileContent(octokit, owner, repo, filePath);
            keyFileContents.push(`--- ${filePath} ---\n${content}`);
          } catch { /* skip */ }
        }
      }

      const repoStructure = `File tree:\n${structureSummary}\n\nKey files:\n${keyFileContents.join("\n\n")}`;

      if (taskRunner.isCancelled(auditId)) return;

      const store = new ChromaDBStore();
      const knowledgeDocs = await store.search("best practices audit compliance", 6);

      if (taskRunner.isCancelled(auditId)) return;

      const prompt = buildAuditPrompt(repoStructure, knowledgeDocs);
      const response = await askCopilot(accessToken, prompt, {
        systemMessage: "You are Repo-Ninja, a best practices auditor. Always respond with valid JSON.",
        timeoutMs: 180_000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        await saveReport(auditId, { ...initialReport, status: "failed" });
        await logWorkFailure(workId, "Failed to parse audit response");
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const report: AuditReport & { status: string } = {
        id: auditId,
        repo: body.repo,
        complianceScore: parsed.complianceScore ?? 0,
        checks: parsed.checks ?? [],
        recommendations: parsed.recommendations ?? [],
        createdAt: initialReport.createdAt,
        status: "completed",
      };

      await saveReport(auditId, report);
      await logWorkComplete(workId, { reportId: auditId, checksCount: report.checks.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await saveReport(auditId, { ...initialReport, status: "failed" });
      await logWorkFailure(workId, message);
    }
  });

  return NextResponse.json({ id: auditId, status: "running" }, { status: 202 });
}
