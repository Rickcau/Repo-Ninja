import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { agentWithGitHub } from "@/lib/copilot-sdk/client";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
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
      await updateAgentTask(task.id, { status: "running", progressMessage: "Starting fix..." });

      // Try to get KB context (graceful degradation if ChromaDB is unavailable)
      let kbContext = "";
      try {
        await updateAgentTask(task.id, { progressMessage: "Querying knowledge base..." });
        const store = new ChromaDBStore();
        const kbQuery = `${finding.category} ${finding.title} ${finding.description}`;
        const knowledgeDocs = await store.search(kbQuery, 5);
        if (knowledgeDocs.length > 0) {
          kbContext = "\n\nRelevant knowledge base documents for context:\n" +
            knowledgeDocs.map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`).join("\n\n");
          await updateAgentTask(task.id, {
            progressMessage: `Retrieved ${knowledgeDocs.length} KB docs`,
          });
        }
      } catch (kbErr) {
        const msg = kbErr instanceof Error ? kbErr.message : "Unknown KB error";
        console.warn(`[reviews/apply-fix] KB query failed (continuing without KB): ${msg}`);
        await updateAgentTask(task.id, { progressMessage: "KB unavailable, continuing without knowledge base grounding" });
      }

      if (taskRunner.isCancelled(task.id)) return;

      // Build the prompt — let the agent handle all git operations via MCP tools
      const prompt = `You are Repo-Ninja, an expert developer agent. You have access to GitHub tools to read files, create branches, commit files, and open pull requests.

Repository: ${owner}/${repoName}

A code review found the following issue that needs to be fixed:

**Finding:** ${finding.title}
**Severity:** ${finding.severity}
**Category:** ${finding.category}
**File:** ${finding.file}${finding.line ? ` (line ${finding.line})` : ""}
**Description:** ${finding.description}
${finding.suggestion ? `**Suggestion:** ${finding.suggestion}` : ""}
${finding.suggestedCode ? `**Suggested code:**\n\`\`\`\n${finding.suggestedCode}\n\`\`\`` : ""}
${finding.codeSnippet ? `**Current code snippet:**\n\`\`\`\n${finding.codeSnippet}\n\`\`\`` : ""}
${kbContext}

Your task:
1. Read the file \`${finding.file}\` from the repository \`${owner}/${repoName}\`
2. Understand the issue and implement the suggested fix
3. Create a new feature branch (e.g. \`repo-ninja/fix/<short-description>\`)
4. Commit the fix with a clear commit message
5. Open a pull request with the following description:

## Automated Fix by Repo-Ninja

**Finding:** ${finding.title}
**Severity:** ${finding.severity}
**File:** \`${finding.file}\`

${finding.description}

---
*Applied automatically by Repo-Ninja*

Important:
- Create a feature branch (not directly on main)
- Make a clean, focused commit that only addresses this specific finding
- The PR title should be: fix: ${finding.title}`;

      await updateAgentTask(task.id, { progressMessage: "Agent is working..." });

      // Track PR URL from agent's tool calls
      let detectedPrUrl = "";
      let detectedBranch = "";

      const finalContent = await agentWithGitHub(
        accessToken,
        prompt,
        (event) => {
          if (taskRunner.isCancelled(task.id)) return;

          if (event.type === "tool_call") {
            const toolMsg = `Using tool: ${event.toolName}`;
            updateAgentTask(task.id, { progressMessage: toolMsg }).catch(() => {});
          } else if (event.type === "tool_result") {
            const detail = event.detail || "";
            const prMatch = detail.match(/https:\/\/github\.com\/[^\s"]+\/pull\/\d+/);
            if (prMatch) detectedPrUrl = prMatch[0];
            const branchMatch = detail.match(/refs\/heads\/([^\s"]+)/);
            if (branchMatch) detectedBranch = branchMatch[1];
          } else if (event.type === "error") {
            updateAgentTask(task.id, { progressMessage: `Error: ${event.detail}` }).catch(() => {});
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

      await updateAgentTask(task.id, {
        status: "completed",
        branch: detectedBranch || undefined,
        prUrl: detectedPrUrl || undefined,
        progressMessage: detectedPrUrl ? "Pull request created successfully" : "Fix completed",
        result: {
          summary: finalContent.slice(0, 1000),
          prUrl: detectedPrUrl || undefined,
        },
      });

      await logWorkComplete(workId, {
        prUrl: detectedPrUrl || undefined,
        branch: detectedBranch || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[reviews/apply-fix] Task ${task.id} failed:`, message);
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
