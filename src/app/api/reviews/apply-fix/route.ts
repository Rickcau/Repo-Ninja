import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOctokit,
  getFileContent,
  createBranch,
  commitFiles,
  createPullRequest,
} from "@/lib/github/octokit";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { nanoid } from "nanoid";
import { taskRunner } from "@/lib/services/task-runner";
import {
  createAgentTask,
  updateAgentTask,
  logWorkStart,
  logWorkComplete,
  logWorkFailure,
} from "@/lib/db/dal";
import type { ReviewFinding } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repo, finding } = (await request.json()) as {
    repo: string;
    finding: ReviewFinding;
  };

  if (!repo || !finding || !finding.file) {
    return NextResponse.json(
      { error: "repo and finding with file are required" },
      { status: 400 }
    );
  }

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return NextResponse.json({ error: "Invalid repo format" }, { status: 400 });
  }

  // Create a background task
  const task = await createAgentTask("code-review", repo, `Apply fix: ${finding.title}`);
  const accessToken = session.accessToken;

  // Enqueue background work
  taskRunner.enqueue(task.id, async () => {
    const workId = await logWorkStart(
      session.user?.email ?? undefined,
      "code-review",
      repo,
      `Apply fix: ${finding.title}`,
      task.id
    );

    try {
      await updateAgentTask(task.id, { status: "running", progressMessage: "Fetching original file..." });

      const octokit = getOctokit(accessToken);
      const originalCode = await getFileContent(octokit, owner, repoName, finding.file!);

      await updateAgentTask(task.id, { progressMessage: "Generating fix with Copilot..." });

      const prompt = `You are Repo-Ninja. Apply the following fix to the file.

File: ${finding.file}
Issue: ${finding.title}
Description: ${finding.description}
Suggestion: ${finding.suggestion || "Apply the suggested fix"}
${finding.suggestedCode ? `Suggested code:\n${finding.suggestedCode}` : ""}

Original file content:
\`\`\`
${originalCode}
\`\`\`

Return ONLY the complete updated file content, with no markdown fences or explanation.`;

      const fixedCode = await askCopilot(accessToken, prompt, {
        systemMessage: "You are Repo-Ninja, an expert developer. Return only the complete updated file content, no explanations.",
        timeoutMs: 180_000,
      });

      const branchName = `repo-ninja/fix/${nanoid(8)}`;
      await updateAgentTask(task.id, { branch: branchName, progressMessage: `Creating branch ${branchName}...` });
      await createBranch(octokit, owner, repoName, branchName, "HEAD");

      await updateAgentTask(task.id, { progressMessage: "Committing fix..." });
      await commitFiles(octokit, owner, repoName, branchName, [
        { path: finding.file!, content: fixedCode },
      ], `fix: ${finding.title}`);

      await updateAgentTask(task.id, { progressMessage: "Creating pull request..." });
      const pr = await createPullRequest(
        octokit, owner, repoName,
        `fix: ${finding.title}`,
        `## Automated Fix by Repo-Ninja\n\n**Finding:** ${finding.title}\n**Severity:** ${finding.severity}\n**File:** \`${finding.file}\`\n\n${finding.description}\n\n---\n*Applied automatically by Repo-Ninja*`,
        branchName, "main"
      );

      await updateAgentTask(task.id, {
        status: "completed",
        prUrl: pr.htmlUrl,
        progressMessage: "Pull request created",
        result: { summary: `Fix applied: ${finding.title}`, prUrl: pr.htmlUrl },
      });

      await logWorkComplete(workId, { prUrl: pr.htmlUrl, branch: branchName });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await updateAgentTask(task.id, {
        status: "failed",
        progressMessage: `Error: ${message}`,
        result: { summary: `Failed: ${message}` },
      });
      await logWorkFailure(workId, message);
    }
  });

  // Return immediately with task ID for polling
  return NextResponse.json({ taskId: task.id, status: "queued" }, { status: 202 });
}
