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

/** Key config files to inspect during a best-practices audit. */
const KEY_FILES = [
  "package.json",
  "tsconfig.json",
  ".eslintrc.json",
  "eslint.config.js",
  "eslint.config.mjs",
  ".prettierrc",
  ".prettierrc.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".github/workflows/ci.yml",
  ".github/workflows/ci.yaml",
  ".github/dependabot.yml",
  "jest.config.ts",
  "jest.config.js",
  "vitest.config.ts",
  "README.md",
  ".env.example",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
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

  try {
    const octokit = getOctokit(session.accessToken);

    // Get repo tree for structure overview
    const tree = await getRepoTree(octokit, owner, repo, "HEAD");
    const structureSummary = tree.slice(0, 100).join("\n");

    // Fetch key config files
    const keyFileContents: string[] = [];
    for (const filePath of KEY_FILES) {
      if (tree.includes(filePath)) {
        try {
          const content = await getFileContent(octokit, owner, repo, filePath);
          keyFileContents.push(`--- ${filePath} ---\n${content}`);
        } catch {
          // Skip files that can't be fetched
        }
      }
    }

    const repoStructure = `File tree:\n${structureSummary}\n\nKey files:\n${keyFileContents.join("\n\n")}`;

    // Query ChromaDB for best-practices docs
    const store = new ChromaDBStore();
    const knowledgeDocs = await store.search("best practices audit compliance", 6);

    // Invoke Copilot SDK
    const prompt = buildAuditPrompt(repoStructure, knowledgeDocs);
    const response = await askCopilot(session.accessToken, prompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse audit response", raw: response }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const report: AuditReport = {
      id: nanoid(),
      repo: body.repo,
      complianceScore: parsed.complianceScore ?? 0,
      checks: parsed.checks ?? [],
      recommendations: parsed.recommendations ?? [],
      createdAt: new Date().toISOString(),
    };

    // Store report for later retrieval
    saveReport(report.id, report);

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Audit failed", details: message }, { status: 500 });
  }
}
