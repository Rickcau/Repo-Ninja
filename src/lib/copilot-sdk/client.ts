import {
  CopilotClient,
  CopilotSession,
  type AssistantMessageEvent,
} from "@github/copilot-sdk";

let client: CopilotClient | null = null;

/**
 * Returns a singleton CopilotClient instance.
 * The client auto-starts when createSession is called.
 */
export function getCopilotClient(): CopilotClient {
  if (!client) {
    client = new CopilotClient();
  }
  return client;
}

/**
 * Send a prompt to Copilot and wait for the full response.
 * Creates a one-shot session, sends the prompt, waits for idle, then destroys the session.
 */
export async function askCopilot(prompt: string): Promise<string> {
  const copilot = getCopilotClient();
  const session = await copilot.createSession({ model: "gpt-4.1" });

  try {
    const response: AssistantMessageEvent | undefined =
      await session.sendAndWait({ prompt }, 120_000);
    return response?.data?.content ?? "";
  } finally {
    await session.destroy();
  }
}

/**
 * Send a prompt to Copilot and stream the response chunks.
 * Calls onChunk for each assistant.message.delta event, then returns the full assembled text.
 */
export async function streamCopilot(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const copilot = getCopilotClient();
  const session = await copilot.createSession({ model: "gpt-4.1" });

  let fullResponse = "";

  // Subscribe to streaming delta events
  session.on("assistant.message.delta" as never, ((event: { data?: { content?: string } }) => {
    const text = event?.data?.content ?? "";
    if (text) {
      fullResponse += text;
      onChunk(text);
    }
  }) as never);

  // Also capture the final assistant message in case deltas are not emitted
  session.on("assistant.message" as never, ((event: AssistantMessageEvent) => {
    // If we got no deltas, use the final message content
    if (!fullResponse) {
      fullResponse = event?.data?.content ?? "";
    }
  }) as never);

  try {
    await session.sendAndWait({ prompt }, 120_000);
    return fullResponse;
  } finally {
    await session.destroy();
  }
}

/**
 * Shutdown the singleton client gracefully.
 * Call this during application shutdown.
 */
export async function stopCopilotClient(): Promise<void> {
  if (client) {
    await client.stop();
    client = null;
  }
}
