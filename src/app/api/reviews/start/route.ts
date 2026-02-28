import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOctokit, getRepoTree, getFileContent } from "@/lib/github/octokit";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildReviewPrompt } from "@/lib/copilot-sdk/prompts";
import type { ReviewRequest, ReviewReport } from "@/lib/types";
import { nanoid } from "nanoid";
import { saveReport } from "../report-store";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import { taskRunner } from "@/lib/services/task-runner";

const MAX_FILES_TO_REVIEW = 15;
const MAX_FILE_SIZE = 50_000; // chars

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ReviewRequest;

  if (!body.repo || !body.reviewTypes?.length || !body.scope) {
    return NextResponse.json({ error: "Missing required fields: repo, reviewTypes, scope" }, { status: 400 });
  }

  const [owner, repo] = body.repo.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repo format. Use owner/repo" }, { status: 400 });
  }

  const reviewId = nanoid();
  const accessToken = session.accessToken;
  const userEmail = session.user?.email ?? undefined;

  // Save initial report with status "running"
  const initialReport: ReviewReport & { status: string } = {
    id: reviewId,
    repo: body.repo,
    reviewTypes: body.reviewTypes,
    overallScore: 0,
    categoryScores: [],
    findings: [],
    createdAt: new Date().toISOString(),
    status: "running",
  };
  await saveReport(reviewId, initialReport);

  // Enqueue background work
  taskRunner.enqueue(reviewId, async () => {
    const workId = await logWorkStart(userEmail, "code-review", body.repo, `Code review: ${body.reviewTypes.join(", ")} on ${body.repo}`, reviewId);

    try {
      const octokit = getOctokit(accessToken);

      const tree = await getRepoTree(octokit, owner, repo, "HEAD");

      if (taskRunner.isCancelled(reviewId)) return;

      let filesToReview = tree.filter((path) => {
        if (/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|lock|min\.)/.test(path)) return false;
        if (path.includes("node_modules/") || path.includes(".git/")) return false;
        return true;
      });

      if (body.filePattern) {
        const pattern = new RegExp(body.filePattern.replace(/\*/g, ".*"));
        filesToReview = filesToReview.filter((path) => pattern.test(path));
      }

      filesToReview = filesToReview.slice(0, MAX_FILES_TO_REVIEW);

      if (taskRunner.isCancelled(reviewId)) return;

      const fileContents: string[] = [];
      for (const filePath of filesToReview) {
        try {
          const content = await getFileContent(octokit, owner, repo, filePath);
          if (content.length <= MAX_FILE_SIZE) {
            fileContents.push(`--- ${filePath} ---\n${content}`);
          }
        } catch {
          // Skip files that can't be fetched
        }
      }

      const codeBlock = fileContents.join("\n\n");

      if (taskRunner.isCancelled(reviewId)) return;

      const store = new ChromaDBStore();
      const knowledgeDocs = await store.search(
        `code review ${body.reviewTypes.join(" ")} best practices`,
        6
      );

      if (taskRunner.isCancelled(reviewId)) return;

      const prompt = buildReviewPrompt(codeBlock, body.reviewTypes, knowledgeDocs);
      const response = await askCopilot(accessToken, prompt, {
        systemMessage: "You are Repo-Ninja, an expert code reviewer. Always respond with valid JSON.",
        timeoutMs: 180_000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        await saveReport(reviewId, { ...initialReport, status: "failed" });
        await logWorkFailure(workId, "Failed to parse review response");
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const report: ReviewReport & { status: string } = {
        id: reviewId,
        repo: body.repo,
        reviewTypes: body.reviewTypes,
        overallScore: parsed.overallScore ?? 0,
        categoryScores: parsed.categoryScores ?? [],
        findings: parsed.findings ?? [],
        createdAt: initialReport.createdAt,
        status: "completed",
      };

      await saveReport(reviewId, report);
      await logWorkComplete(workId, { reportId: reviewId, findingsCount: report.findings.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await saveReport(reviewId, { ...initialReport, status: "failed" });
      await logWorkFailure(workId, message);
    }
  });

  return NextResponse.json({ id: reviewId, status: "running" }, { status: 202 });
}
