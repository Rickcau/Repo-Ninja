import {
  CopilotClient,
  approveAll,
  defineTool,
  type AssistantMessageEvent,
} from "@github/copilot-sdk";
import { Octokit } from "octokit";

export interface AgentProgressEvent {
  type: "tool_call" | "tool_result" | "message" | "done" | "error";
  toolName?: string;
  detail?: string;
  content?: string;
}

const LOG_PREFIX = "[CopilotSDK]";

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

/**
 * Creates a CopilotClient authenticated with the user's GitHub OAuth token.
 * Each user gets their own client — no shared server-side token needed.
 *
 * The SDK spawns the bundled Copilot CLI process and communicates via JSON-RPC.
 * The githubToken is passed to the CLI via environment variable for auth.
 */
export function getCopilotClient(accessToken: string): CopilotClient {
  return new CopilotClient({
    githubToken: accessToken,
    logLevel: process.env.NODE_ENV === "development" ? "info" : "error",
  });
}

/**
 * Send a prompt to Copilot and wait for the full response.
 * Uses the authenticated user's token so each user's requests are scoped to their account.
 *
 * Follows the recommended SDK lifecycle:
 * 1. Create client → start() → createSession() → sendAndWait() → destroy() → stop()
 */
export async function askCopilot(
  accessToken: string,
  prompt: string,
  options?: { model?: string; systemMessage?: string; timeoutMs?: number }
): Promise<string> {
  const copilot = getCopilotClient(accessToken);

  log("Starting CopilotClient...");
  await copilot.start();
  log("CopilotClient started successfully");

  const model = options?.model || process.env.COPILOT_MODEL || "gpt-4.1";

  try {
    // Check auth status
    try {
      const authStatus = await copilot.getAuthStatus();
      log("Auth status:", JSON.stringify(authStatus));
    } catch (e) {
      log("Could not get auth status:", e);
    }

    log("Creating session with model:", model);

    const sessionConfig: Parameters<typeof copilot.createSession>[0] = {
      model,
    };

    if (options?.systemMessage) {
      sessionConfig.systemMessage = {
        mode: "append",
        content: options.systemMessage,
      };
    }

    const session = await copilot.createSession(sessionConfig);
    log("Session created:", session.sessionId);

    // Subscribe to events for debugging
    session.on((event) => {
      const type = event.type;
      if (type === "session.error") {
        log(`Event [${type}]:`, JSON.stringify((event as Record<string, unknown>).data));
      } else if (type === "assistant.message") {
        log(`Event [${type}]: response received`);
      } else {
        log(`Event [${type}]`);
      }
    });

    const timeoutMs = options?.timeoutMs ?? 180_000; // 3 minutes default (matching reference repo)
    log("Sending prompt, timeout:", timeoutMs, "ms");

    const response: AssistantMessageEvent | undefined =
      await session.sendAndWait({ prompt }, timeoutMs);

    const content = response?.data?.content ?? "";
    log("Response received, length:", content.length);

    await session.destroy();
    log("Session destroyed");

    return content;
  } catch (error) {
    log("ERROR:", error instanceof Error ? error.message : error);
    log("STACK:", error instanceof Error ? error.stack : "");
    throw error;
  } finally {
    try {
      await copilot.stop();
      log("Client stopped");
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Send a prompt to Copilot and stream the response chunks.
 * Uses the authenticated user's token.
 */
export async function streamCopilot(
  accessToken: string,
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: { model?: string; systemMessage?: string; timeoutMs?: number }
): Promise<string> {
  const copilot = getCopilotClient(accessToken);

  log("Starting CopilotClient for streaming...");
  await copilot.start();

  const model = options?.model || process.env.COPILOT_MODEL || "gpt-4.1";

  let fullResponse = "";

  try {
    const sessionConfig: Parameters<typeof copilot.createSession>[0] = {
      model,
    };

    if (options?.systemMessage) {
      sessionConfig.systemMessage = {
        mode: "append",
        content: options.systemMessage,
      };
    }

    const session = await copilot.createSession(sessionConfig);

    session.on("assistant.message.delta" as never, ((event: { data?: { content?: string } }) => {
      const text = event?.data?.content ?? "";
      if (text) {
        fullResponse += text;
        onChunk(text);
      }
    }) as never);

    session.on("assistant.message" as never, ((event: AssistantMessageEvent) => {
      if (!fullResponse) {
        fullResponse = event?.data?.content ?? "";
      }
    }) as never);

    const timeoutMs = options?.timeoutMs ?? 180_000;

    await session.sendAndWait({ prompt }, timeoutMs);

    await session.destroy();
    return fullResponse;
  } catch (error) {
    log("Streaming ERROR:", error instanceof Error ? error.message : error);
    throw error;
  } finally {
    try {
      await copilot.stop();
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run an agentic task using the GitHub MCP server for built-in GitHub tools.
 *
 * The agent can autonomously create repos, issues, comments, rulesets, PRs etc.
 * using the authenticated user's token — no manual Octokit calls needed.
 *
 * @param accessToken  User's GitHub OAuth token
 * @param prompt       Natural language instruction for the agent
 * @param onProgress   Callback for streaming progress events (tool calls, messages)
 * @param timeoutMs    Max time to wait for completion (default 5 min)
 * @returns            Final assistant message content
 */
/**
 * Creates a custom tool that commits multiple files to a GitHub repo in a
 * single commit using the Git Trees API. This avoids 409 SHA conflicts that
 * occur when the Contents API is called in parallel.
 */
function createCommitFilesTool(accessToken: string) {
  return defineTool("commit_files", {
    description:
      "Commit multiple files to a GitHub repository in a single atomic commit. " +
      "Use this instead of create_or_update_file when you need to add several files at once. " +
      "All files are committed in one operation — no conflicts, no race conditions.",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (username or org)" },
        repo: { type: "string", description: "Repository name" },
        branch: { type: "string", description: "Branch to commit to (e.g. 'main')" },
        message: { type: "string", description: "Commit message" },
        files: {
          type: "array",
          description: "Array of files to create/update",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path (e.g. 'src/index.ts')" },
              content: { type: "string", description: "Full file content" },
            },
            required: ["path", "content"],
          },
        },
      },
      required: ["owner", "repo", "branch", "message", "files"],
    },
    handler: async (args: {
      owner: string;
      repo: string;
      branch: string;
      message: string;
      files: Array<{ path: string; content: string }>;
    }) => {
      const octokit = new Octokit({ auth: accessToken });

      // 1. Get the current commit SHA for the branch
      const { data: ref } = await octokit.rest.git.getRef({
        owner: args.owner,
        repo: args.repo,
        ref: `heads/${args.branch}`,
      });
      const baseSha = ref.object.sha;

      // 2. Get the base tree
      const { data: baseCommit } = await octokit.rest.git.getCommit({
        owner: args.owner,
        repo: args.repo,
        commit_sha: baseSha,
      });
      const baseTreeSha = baseCommit.tree.sha;

      // 3. Create blobs for all files in parallel
      const blobResults = await Promise.all(
        args.files.map(async (file) => {
          const { data: blob } = await octokit.rest.git.createBlob({
            owner: args.owner,
            repo: args.repo,
            content: file.content,
            encoding: "utf-8",
          });
          return { path: file.path, sha: blob.sha };
        })
      );

      // 4. Create a new tree with all files
      const { data: newTree } = await octokit.rest.git.createTree({
        owner: args.owner,
        repo: args.repo,
        base_tree: baseTreeSha,
        tree: blobResults.map((b) => ({
          path: b.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: b.sha,
        })),
      });

      // 5. Create a commit
      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner: args.owner,
        repo: args.repo,
        message: args.message,
        tree: newTree.sha,
        parents: [baseSha],
      });

      // 6. Update the branch reference
      await octokit.rest.git.updateRef({
        owner: args.owner,
        repo: args.repo,
        ref: `heads/${args.branch}`,
        sha: newCommit.sha,
      });

      return {
        commitSha: newCommit.sha,
        commitUrl: newCommit.html_url,
        filesCreated: args.files.map((f) => f.path),
        message: `Successfully committed ${args.files.length} files in a single commit.`,
      };
    },
  });
}

export async function agentWithGitHub(
  accessToken: string,
  prompt: string,
  onProgress: (event: AgentProgressEvent) => void,
  timeoutMs = 300_000
): Promise<string> {
  // NOTE: cliArgs: ["--enable-all-github-mcp-tools"] is broken in the SDK
  // (github/copilot-sdk Issue #128). Instead, we configure the GitHub MCP
  // server explicitly via the session's mcpServers config using the remote
  // hosted GitHub MCP server at https://api.githubcopilot.com/mcp/.
  const copilot = new CopilotClient({
    githubToken: accessToken,
    logLevel: process.env.NODE_ENV === "development" ? "info" : "error",
  });

  log("Starting CopilotClient (GitHub MCP via remote server)...");
  await copilot.start();

  const model = process.env.COPILOT_MODEL || "gpt-4.1";
  let finalContent = "";

  try {
    const commitFilesTool = createCommitFilesTool(accessToken);

    const sessionConfig: Parameters<typeof copilot.createSession>[0] = {
      model,
      streaming: true,
      onPermissionRequest: approveAll,
      excludedTools: ["bash", "run_commands", "task", "create_or_update_file"],
      tools: [commitFilesTool],
      mcpServers: {
        github: {
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          tools: ["*"],
        } as unknown as import("@github/copilot-sdk").MCPServerConfig,
      },
    };

    const session = await copilot.createSession(sessionConfig);

    log("Session created (GitHub MCP):", session.sessionId);

    // Track toolCallId → toolName for execution_complete events
    const toolCallMap = new Map<string, string>();

    session.on((event) => {
      const type = event.type as string;
      const data = (event as Record<string, unknown>).data as Record<string, unknown> | undefined;

      log(`Event [${type}]:`, JSON.stringify(data)?.slice(0, 300));

      if (type === "tool.execution_start") {
        const toolCallId = (data?.toolCallId ?? "") as string;
        const toolName = (data?.toolName ?? data?.mcpToolName ?? "tool") as string;
        const args = data?.arguments ? JSON.stringify(data.arguments).slice(0, 200) : "";
        if (toolCallId) toolCallMap.set(toolCallId, toolName);
        onProgress({ type: "tool_call", toolName, detail: args });
      } else if (type === "tool.execution_complete") {
        const toolCallId = (data?.toolCallId ?? "") as string;
        const toolName = toolCallMap.get(toolCallId) ?? "tool";
        onProgress({ type: "tool_result", toolName });
      } else if (type === "assistant.message_delta") {
        // deltaContent is the streaming field name per the SDK source
        const chunk = (data?.deltaContent ?? "") as string;
        if (chunk) {
          finalContent += chunk;
          onProgress({ type: "message", content: chunk });
        }
      } else if (type === "assistant.message") {
        // Non-streaming fallback — grab content if we didn't get deltas
        const content = (data?.content ?? "") as string;
        if (content && !finalContent) {
          finalContent = content;
          onProgress({ type: "message", content });
        }
      } else if (type === "session.error") {
        log("Session error:", JSON.stringify(data));
        onProgress({ type: "error", detail: JSON.stringify(data) });
      }
    });

    const response = await session.sendAndWait({ prompt }, timeoutMs);
    if (response?.data?.content && !finalContent) {
      finalContent = response.data.content;
    }

    onProgress({ type: "done", content: finalContent });
    await session.destroy();
    return finalContent;
  } catch (error) {
    log("agentWithGitHub ERROR:", error instanceof Error ? error.message : error);
    onProgress({ type: "error", detail: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    try {
      await copilot.stop();
    } catch {
      // Ignore cleanup errors
    }
  }
}
