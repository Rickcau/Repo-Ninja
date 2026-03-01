import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTask, updateTask } from "@/lib/agent-store";
import { agentWithGitHub } from "@/lib/copilot-sdk/client";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { taskRunner } from "@/lib/services/task-runner";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import type { AgentTaskType } from "@/lib/types";

interface StartRequest {
  type: AgentTaskType;
  repo: string;
  description: string;
  issueNumber?: number;
}

const ACTION_TYPE_MAP: Record<string, string> = {
  "issue-solver": "agent-issue-solver",
  "code-writer": "agent-code-writer",
  "custom-task": "agent-custom-task",
};

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
    const actionType = ACTION_TYPE_MAP[type] || "agent-code-writer";
    const workId = await logWorkStart(
      userEmail,
      actionType as import("@/lib/db/dal").ActionType,
      repo,
      description,
      task.id
    );

    try {
      await updateTask(task.id, { status: "running", progressMessage: "Task started" });

      if (taskRunner.isCancelled(task.id)) return;

      // Try to get KB context (graceful degradation if ChromaDB is unavailable)
      let kbContext = "";
      try {
        await updateTask(task.id, { progressMessage: "Querying knowledge base..." });
        const store = new ChromaDBStore();
        const kbQuery = type === "issue-solver"
          ? "agent instructions issue solving"
          : type === "custom-task"
            ? description
            : "agent instructions code writing";
        const knowledgeDocs = await store.search(kbQuery, 5);
        if (knowledgeDocs.length > 0) {
          kbContext = "\n\nRelevant knowledge base documents for context:\n" +
            knowledgeDocs.map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`).join("\n\n");
          await updateTask(task.id, {
            progressMessage: `Retrieved ${knowledgeDocs.length} KB docs`,
          });
        }
      } catch (kbErr) {
        const msg = kbErr instanceof Error ? kbErr.message : "Unknown KB error";
        console.warn(`[agents/start] KB query failed (continuing without KB): ${msg}`);
        await updateTask(task.id, { progressMessage: "KB unavailable, continuing without knowledge base grounding" });
      }

      if (taskRunner.isCancelled(task.id)) return;

      // Build the prompt — let the agent figure out the best approach
      const prompt = buildAgentPrompt(type, repo, description, issueNumber, kbContext);

      await updateTask(task.id, { progressMessage: "Agent is working..." });

      // Track PR URL from agent's tool calls
      let detectedPrUrl = "";
      let detectedBranch = "";

      // Use the agentic Copilot function — it has GitHub MCP tools
      // and can autonomously read repos, create branches, commit, and open PRs
      const finalContent = await agentWithGitHub(
        accessToken,
        prompt,
        (event) => {
          if (taskRunner.isCancelled(task.id)) return;

          if (event.type === "tool_call") {
            const toolMsg = `Using tool: ${event.toolName}`;
            updateTask(task.id, { progressMessage: toolMsg }).catch(() => {});
          } else if (event.type === "tool_result") {
            // Try to detect PR URL or branch from tool results
            const detail = event.detail || "";
            const prMatch = detail.match(/https:\/\/github\.com\/[^\s"]+\/pull\/\d+/);
            if (prMatch) detectedPrUrl = prMatch[0];
            const branchMatch = detail.match(/refs\/heads\/([^\s"]+)/);
            if (branchMatch) detectedBranch = branchMatch[1];
          } else if (event.type === "error") {
            updateTask(task.id, { progressMessage: `Error: ${event.detail}` }).catch(() => {});
          }
        },
        300_000 // 5 minute timeout
      );

      if (taskRunner.isCancelled(task.id)) return;

      // Try to extract PR URL from the agent's final message if not detected from tools
      if (!detectedPrUrl) {
        const prMatch = finalContent.match(/https:\/\/github\.com\/[^\s)]+\/pull\/\d+/);
        if (prMatch) detectedPrUrl = prMatch[0];
      }

      await updateTask(task.id, {
        status: "completed",
        branch: detectedBranch || undefined,
        prUrl: detectedPrUrl || undefined,
        progressMessage: detectedPrUrl ? "Pull request created successfully" : "Task completed",
        result: {
          summary: finalContent.slice(0, 1000),
          prUrl: detectedPrUrl || undefined,
        },
      });

      await logWorkComplete(workId, {
        prUrl: detectedPrUrl || undefined,
        branch: detectedBranch || undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : "";
      console.error(`[agents/start] Task ${task.id} failed:`, message, stack);
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

/**
 * Build a natural-language prompt for the agent.
 * The agent has full GitHub MCP tools — it can read repos, create branches,
 * commit files, and open PRs autonomously. No need for JSON output formats.
 */
function buildAgentPrompt(
  type: string,
  repo: string,
  description: string,
  issueNumber: number | undefined,
  kbContext: string
): string {
  const base = `You are Repo-Ninja, an expert developer agent. You have access to GitHub tools to read repositories, create branches, commit files, and open pull requests.

Repository: ${repo}
`;

  let taskInstructions: string;

  switch (type) {
    case "issue-solver":
      taskInstructions = issueNumber
        ? `Read issue #${issueNumber} in ${repo}, understand the problem, and create a pull request that solves it. ${description}`
        : `${description}. Create a pull request with the fix.`;
      break;

    case "code-writer":
      taskInstructions = `${description}

Create a new branch, implement the code changes, and open a pull request.`;
      break;

    case "custom-task":
      taskInstructions = `${description}

If this task involves code changes, create a new branch, make the changes, and open a pull request.`;
      break;

    default:
      taskInstructions = description;
  }

  return `${base}
Task: ${taskInstructions}
${kbContext}

Important:
- Create a feature branch (not directly on main)
- Make clean, well-organized commits
- Open a pull request with a clear description of what was done
- Follow existing patterns and conventions in the repository`;
}
