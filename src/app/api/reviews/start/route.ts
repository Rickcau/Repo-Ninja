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

  try {
    const octokit = getOctokit(session.accessToken);

    // Get repo file tree
    const tree = await getRepoTree(octokit, owner, repo, "HEAD");

    // Filter files based on scope and pattern
    let filesToReview = tree.filter((path) => {
      // Skip non-code files
      if (/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|lock|min\.)/.test(path)) return false;
      if (path.includes("node_modules/") || path.includes(".git/")) return false;
      return true;
    });

    if (body.filePattern) {
      const pattern = new RegExp(body.filePattern.replace(/\*/g, ".*"));
      filesToReview = filesToReview.filter((path) => pattern.test(path));
    }

    // Limit the number of files
    filesToReview = filesToReview.slice(0, MAX_FILES_TO_REVIEW);

    // Fetch file contents
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

    // Query ChromaDB for review instructions
    const store = new ChromaDBStore();
    const knowledgeDocs = await store.search(
      `code review ${body.reviewTypes.join(" ")} best practices`,
      6
    );

    // Invoke Copilot SDK
    const prompt = buildReviewPrompt(codeBlock, body.reviewTypes, knowledgeDocs);
    const response = await askCopilot(prompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse review response", raw: response }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const report: ReviewReport = {
      id: nanoid(),
      repo: body.repo,
      reviewTypes: body.reviewTypes,
      overallScore: parsed.overallScore ?? 0,
      categoryScores: parsed.categoryScores ?? [],
      findings: parsed.findings ?? [],
      createdAt: new Date().toISOString(),
    };

    // Store report for later retrieval
    saveReport(report.id, report);

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Review failed", details: message }, { status: 500 });
  }
}
