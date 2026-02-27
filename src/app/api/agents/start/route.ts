import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTask, updateTask } from "@/lib/agent-store";
import {
  getOctokit,
  getRepoTree,
  listRepoIssues,
  createBranch,
  commitFiles,
  createPullRequest,
} from "@/lib/github/octokit";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildIssueSolverPrompt } from "@/lib/copilot-sdk/prompts";
import { taskRunner } from "@/lib/services/task-runner";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import type { AgentTaskType } from "@/lib/types";

interface StartRequest {
  type: AgentTaskType;
  repo: string;
  description: string;
  issueNumber?: number;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as StartRequest;
  const { type, repo, description, issueNumber } = body;

  if (!type || !repo || !description) {
    return NextResponse.json(
      { error: "type, repo, and description are required" },
      { status: 400 }
    );
  }

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return NextResponse.json(
      { error: "repo must be in owner/repo format" },
      { status: 400 }
    );
  }

  // Create the task in the database
  const task = await createTask(type, repo, description);
  const accessToken = session.accessToken;
  const userEmail = session.user?.email ?? undefined;

  // Enqueue background work — returns immediately
  taskRunner.enqueue(task.id, async () => {
    const workId = await logWorkStart(
      userEmail,
      type === "issue-solver" ? "agent-issue-solver" : "agent-code-writer",
      repo,
      description,
      task.id
    );

    try {
      await updateTask(task.id, { status: "running", progressMessage: "Task started" });

      const octokit = getOctokit(accessToken);

      // Fetch repo context
      await updateTask(task.id, { progressMessage: "Fetching repository context..." });
      const tree = await getRepoTree(octokit, owner, repoName, "HEAD");
      const repoContext = tree.slice(0, 100).join("\n");

      if (taskRunner.isCancelled(task.id)) return;

      // Get issue details if solving an issue
      let issueTitle = description;
      let issueBody = "";
      if (type === "issue-solver" && issueNumber) {
        await updateTask(task.id, { progressMessage: `Fetching issue #${issueNumber}...` });
        const issues = await listRepoIssues(octokit, owner, repoName);
        const issue = issues.find((i) => i.number === issueNumber);
        if (issue) {
          issueTitle = issue.title;
          issueBody = issue.body;
        }
      }

      if (taskRunner.isCancelled(task.id)) return;

      // Query ChromaDB for agent instructions
      await updateTask(task.id, { progressMessage: "Querying knowledge base..." });
      const store = new ChromaDBStore();
      const knowledgeDocs = await store.search(
        type === "issue-solver" ? "agent instructions issue solving" : "agent instructions code writing",
        5
      );

      await updateTask(task.id, {
        progressMessage: `Retrieved ${knowledgeDocs.length} KB docs (top score: ${knowledgeDocs[0]?.score?.toFixed(2) ?? "N/A"})`,
      });

      if (taskRunner.isCancelled(task.id)) return;

      // Build prompt and invoke Copilot
      await updateTask(task.id, { progressMessage: "Invoking Copilot for code generation..." });
      const prompt =
        type === "issue-solver"
          ? buildIssueSolverPrompt(issueTitle, issueBody, repoContext, knowledgeDocs)
          : buildCodeWriterPrompt(description, repoContext, knowledgeDocs);

      const response = await askCopilot(accessToken, prompt);

      if (taskRunner.isCancelled(task.id)) return;

      // Parse the response
      let parsed: {
        summary: string;
        files: Array<{ path: string; content: string }>;
        commitMessage: string;
      };

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] || response);
      } catch {
        await updateTask(task.id, {
          status: "failed",
          progressMessage: "Failed to parse Copilot response",
          result: { summary: "Failed to parse Copilot response" },
        });
        await logWorkFailure(workId, "Failed to parse Copilot response");
        return;
      }

      // Create branch
      const branchName = `repo-ninja/${type}/${task.id}`;
      await updateTask(task.id, {
        branch: branchName,
        progressMessage: `Creating branch ${branchName}...`,
      });
      await createBranch(octokit, owner, repoName, branchName, "HEAD");

      // Commit files
      if (parsed.files && parsed.files.length > 0) {
        await updateTask(task.id, { progressMessage: `Committing ${parsed.files.length} files...` });
        await commitFiles(
          octokit, owner, repoName, branchName,
          parsed.files,
          parsed.commitMessage || `feat: ${description}`
        );
      }

      if (taskRunner.isCancelled(task.id)) return;

      // Create pull request
      await updateTask(task.id, { progressMessage: "Creating pull request..." });
      const pr = await createPullRequest(
        octokit, owner, repoName,
        parsed.commitMessage || `[Repo-Ninja] ${description}`,
        `## Automated by Repo-Ninja\n\n${parsed.summary}\n\n---\nGenerated by Repo-Ninja Agent (${type})`,
        branchName, "main"
      );

      await updateTask(task.id, {
        status: "completed",
        prUrl: pr.htmlUrl,
        progressMessage: "Pull request created successfully",
        result: { summary: parsed.summary, prUrl: pr.htmlUrl },
      });

      await logWorkComplete(workId, { prUrl: pr.htmlUrl, branch: branchName, filesChanged: parsed.files?.length ?? 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await updateTask(task.id, {
        status: "failed",
        progressMessage: `Error: ${message}`,
        result: { summary: `Task failed: ${message}` },
      });
      await logWorkFailure(workId, message);
    }
  });

  // Return immediately (HTTP 202 Accepted)
  return NextResponse.json({ task }, { status: 202 });
}

function buildCodeWriterPrompt(
  description: string,
  repoContext: string,
  knowledgeDocs: { id: string; content: string; metadata: { filename: string } }[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert developer. Write code based on the following request and standards:

${context}

Request: ${description}

Repository context:
${repoContext}

Generate the code changes needed. For each file, provide the complete content.
Respond as JSON:
{
  "summary": "Brief description of changes",
  "files": [
    { "path": "src/example.ts", "action": "create", "content": "full file content..." }
  ],
  "commitMessage": "feat: description of changes"
}

Be specific about file paths and follow existing patterns in the repository.`;
}
