import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { agentWithGitHub, type AgentProgressEvent } from "@/lib/copilot-sdk/client";

/**
 * SSE endpoint for agent-driven repo scaffolding.
 *
 * Events sent to the client:
 *   { type: "step",    step: string, detail?: string }   — a scaffold step started/completed
 *   { type: "tool",    name: string, args?: string }      — MCP tool call
 *   { type: "tool_done", name: string }                   — MCP tool finished
 *   { type: "message", content: string }                  — agent text delta
 *   { type: "done",    repoUrl?: string, summary: string }— scaffold complete
 *   { type: "error",   detail: string }                   — something went wrong
 */
export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.accessToken) {
    return NextResponse.json(
      { error: "Not signed in." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({})) as { cleanup?: boolean; repoName?: string };
  const cleanup = body.cleanup === true;
  const repoName = body.repoName || `repo-ninja-scaffold-${Date.now()}`;
  const owner = authSession.user?.name ?? authSession.user?.email ?? "unknown";

  const prompt = `
You are Repo-Ninja's scaffold agent. Your job is to create a fully scaffolded GitHub repository with real, working code — all done directly via the GitHub API (no PRs, no issues, no coding agent).

You have a custom tool called **commit_files** that commits multiple files to a repo in a single atomic commit using the Git Trees API. This is much faster than creating files one at a time.

Do the following steps in order:

1. **Create repo**: Use the GitHub MCP create_repository tool to create a new public repository named "${repoName}" for user "${owner}" (this is a personal user account, NOT an organization) with description "Scaffolded by Repo-Ninja". Set auto_init to true so it has a default branch. WAIT for this to complete before step 2.

2. **Commit all scaffold files at once**: Use the **commit_files** tool to create ALL of the following files in a single commit on the "main" branch with commit message "feat: scaffold Hello World TypeScript API":

   - **package.json** — name: "${repoName}", version: "1.0.0", scripts: { start: "node dist/index.js", dev: "ts-node src/index.ts", build: "tsc" }. Dependencies: express@^4. DevDependencies: typescript, ts-node, @types/express, @types/node.
   - **tsconfig.json** — strict mode, target ES2022, module commonjs, outDir ./dist, rootDir ./src, esModuleInterop true.
   - **src/index.ts** — Express server listening on port 3000, imports and mounts hello route at /hello.
   - **src/routes/hello.ts** — Express Router, GET / returns JSON { message: "Hello, World!", timestamp: new Date().toISOString() }.
   - **README.md** — Project name, description, install instructions (npm install), run instructions (npm run dev), build instructions (npm run build).
   - **.gitignore** — node_modules, dist, .env

   Each file must have complete, real, working TypeScript/JSON content. No placeholders.

3. **Report results**: List every file created with its path. Provide the repository URL: https://github.com/${owner}/${repoName}

${cleanup ? "4. **Cleanup**: Delete the repository after confirming all files were created." : "Do NOT delete the repository."}
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
          authSession.accessToken!,
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
