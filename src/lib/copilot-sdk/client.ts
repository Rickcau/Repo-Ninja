import {
  CopilotClient,
  type AssistantMessageEvent,
} from "@github/copilot-sdk";

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
