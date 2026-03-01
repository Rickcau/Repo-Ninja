import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { agentWithGitHub } from "@/lib/copilot-sdk/client";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import type { ReviewRequest, ReviewReport } from "@/lib/types";
import { nanoid } from "nanoid";
import { saveReport } from "../report-store";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import { taskRunner } from "@/lib/services/task-runner";

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
      if (taskRunner.isCancelled(reviewId)) return;

      // Try to get KB context (graceful degradation)
      let kbContext = "";
      try {
        const store = new ChromaDBStore();
        const knowledgeDocs = await store.search(
          `code review ${body.reviewTypes.join(" ")} best practices`,
          6
        );
        if (knowledgeDocs.length > 0) {
          kbContext = "\n\nRelevant best practices from the knowledge base:\n" +
            knowledgeDocs.map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`).join("\n\n");
        }
      } catch (kbErr) {
        console.warn(`[reviews/start] KB unavailable, continuing without:`, kbErr instanceof Error ? kbErr.message : kbErr);
      }

      if (taskRunner.isCancelled(reviewId)) return;

      // Build scope instructions for the agent
      let scopeInstructions = "";
      if (body.scope === "pr" && body.prNumber) {
        scopeInstructions = `Scope: Review Pull Request #${body.prNumber}. Use the GitHub tools to read the PR diff and changed files. Focus your review on the changes introduced by this PR.`;
      } else if (body.scope === "files" && body.filePattern) {
        scopeInstructions = `Scope: Review files matching the pattern "${body.filePattern}". Use the GitHub tools to list the repository contents and read files that match this pattern.`;
      } else {
        scopeInstructions = `Scope: Full repository review. Use the GitHub tools to read the repository structure, then read the most important source files to perform your review. Focus on source code files — skip binary files, lock files, and node_modules.`;
      }

      const prompt = `You are Repo-Ninja, an expert code reviewer. You have access to GitHub tools to read repository files directly.

Repository: ${body.repo}

${scopeInstructions}

Review categories to evaluate: ${body.reviewTypes.join(", ")}

For each category, thoroughly review the code by reading the actual source files. Look for:
- **security**: SQL injection, XSS, auth issues, secrets in code, insecure dependencies
- **performance**: N+1 queries, unnecessary re-renders, missing caching, large bundle sizes, inefficient algorithms
- **accessibility**: Missing ARIA labels, poor keyboard navigation, missing alt text, color contrast issues
- **general**: Code quality, naming conventions, error handling, dead code, missing types, anti-patterns
- **custom**: Any other issues you find noteworthy
${kbContext}

After reviewing the repository, respond with ONLY a JSON object in this exact format (no markdown, no explanation, just the JSON):
{
  "overallScore": 7.8,
  "categoryScores": [
    { "category": "security", "score": 8, "maxScore": 10, "issueCount": 2 }
  ],
  "findings": [
    { "severity": "high", "category": "security", "title": "Hardcoded API key", "description": "An API key is hardcoded in the source file", "file": "src/lib/api.ts", "line": 45, "suggestion": "Move the API key to environment variables" }
  ]
}

Severity must be one of: "critical", "high", "medium", "low", "info".
Category must be one of the requested review types: ${body.reviewTypes.join(", ")}.
Include a categoryScores entry for each requested review type.
Be thorough — read as many files as needed to give an accurate, detailed review.`;

      const response = await agentWithGitHub(
        accessToken,
        prompt,
        (event) => {
          if (event.type === "error") {
            console.error(`[reviews/start] Agent error:`, event.detail);
          }
        },
        300_000
      );

      if (taskRunner.isCancelled(reviewId)) return;

      // Parse the JSON from the agent's response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const snippet = response.slice(0, 300).replace(/\n/g, " ");
        const errMsg = `No JSON found in agent response. Starts with: ${snippet}`;
        console.error(`[reviews/start] ${errMsg}`);
        await saveReport(reviewId, { ...initialReport, status: "failed", findings: [{ severity: "high" as const, category: "security", title: "Parse Error", description: errMsg }] });
        await logWorkFailure(workId, errMsg);
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
      console.error(`[reviews/start] Review ${reviewId} failed:`, message);
      await saveReport(reviewId, { ...initialReport, status: "failed", findings: [{ severity: "high" as const, category: "security", title: "Review Error", description: message }] });
      await logWorkFailure(workId, message);
    }
  });

  return NextResponse.json({ id: reviewId, status: "running" }, { status: 202 });
}
