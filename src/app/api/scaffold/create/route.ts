import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { agentWithGitHub, type AgentProgressEvent } from "@/lib/copilot-sdk/client";
import type { ScaffoldPlan } from "@/lib/types";

/**
 * SSE endpoint for agent-driven repo scaffolding.
 *
 * The agent uses the commit_files custom tool (Git Trees API) to create all
 * scaffold files in a single atomic commit — typically completes in ~20s.
 *
 * Events sent to the client:
 *   { type: "step",      step: string, detail?: string }
 *   { type: "tool",      name: string, args?: string }
 *   { type: "tool_done", name: string }
 *   { type: "message",   content: string }
 *   { type: "done",      repoUrl?: string, summary: string }
 *   { type: "error",     detail: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = session.accessToken;
  if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 });

  const { plan, repoName, isPrivate } = (await request.json()) as {
    plan: ScaffoldPlan;
    repoName: string;
    isPrivate: boolean;
  };

  const owner = session.user?.name ?? session.user?.email ?? "unknown";
  const visibility = isPrivate ? "private" : "public";

  // Build a file list for the prompt from the plan structure
  const fileList = plan.structure
    .map((f) => {
      let entry = `- **${f.path}**: ${f.description}`;
      if (f.content) {
        entry += `\n    Content hint:\n    \`\`\`\n    ${f.content.substring(0, 500)}\n    \`\`\``;
      }
      return entry;
    })
    .join("\n");

  const bestPractices =
    plan.bestPracticesApplied.length > 0
      ? `Apply these best practices: ${plan.bestPracticesApplied.join(", ")}`
      : "";

  const prompt = `
You are Repo-Ninja's scaffold agent. Your job is to create a fully scaffolded GitHub repository with real, working code — all done directly via the GitHub API (no PRs, no issues, no coding agent).

You have a custom tool called **commit_files** that commits multiple files to a repo in a single atomic commit using the Git Trees API. This is much faster than creating files one at a time.

Do the following steps in order:

1. **Create repo**: Use the GitHub MCP create_repository tool to create a new ${visibility} repository named "${repoName}" for user "${owner}" (this is a personal user account, NOT an organization) with description "${plan.description}". Set auto_init to true so it has a default branch. WAIT for this to complete before step 2.

2. **Commit all scaffold files at once**: Use the **commit_files** tool to create ALL of the following files in a single commit on the "main" branch with commit message "feat: initial scaffold by Repo-Ninja".

   ${bestPractices}

   Files to create:
${fileList}

   Each file must have complete, real, working code. No placeholders or TODOs. Generate proper implementation based on each file's description.

3. **Report results**: List every file created with its path. Provide the repository URL: https://github.com/${owner}/${repoName}

Do NOT delete the repository.
`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      send({ type: "step", step: "Starting scaffold agent", detail: `Creating repo: ${repoName}` });
      const t = Date.now();

      try {
        let finalMessage = "";

        await agentWithGitHub(
          accessToken,
          prompt,
          (event: AgentProgressEvent) => {
            if (event.type === "tool_call") {
              send({ type: "tool", name: event.toolName ?? "unknown", args: event.detail });
            } else if (event.type === "tool_result") {
              send({ type: "tool_done", name: event.toolName ?? "unknown" });
            } else if (event.type === "message" && event.content) {
              finalMessage += event.content;
              send({ type: "message", content: event.content });
            } else if (event.type === "error") {
              send({ type: "error", detail: event.detail ?? "Unknown error" });
            }
          }
        );

        const repoUrlMatch = finalMessage.match(/https:\/\/github\.com\/[^\s)>\]]+/);
        send({
          type: "done",
          repoUrl: repoUrlMatch?.[0],
          repoName,
          summary: `Scaffold completed in ${((Date.now() - t) / 1000).toFixed(1)}s`,
          durationMs: Date.now() - t,
        });
      } catch (err) {
        send({
          type: "error",
          detail: `Failed after ${((Date.now() - t) / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
