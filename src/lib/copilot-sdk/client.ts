import {
  CopilotClient,
  type AssistantMessageEvent,
} from "@github/copilot-sdk";

/**
 * Creates a CopilotClient authenticated with the user's GitHub OAuth token.
 * Each user gets their own client — no shared server-side token needed.
 */
export function getCopilotClient(accessToken: string): CopilotClient {
  return new CopilotClient({ githubToken: accessToken });
}

/**
 * Send a prompt to Copilot and wait for the full response.
 * Uses the authenticated user's token so each user's requests are scoped to their account.
 */
export async function askCopilot(accessToken: string, prompt: string): Promise<string> {
  const copilot = getCopilotClient(accessToken);
  const session = await copilot.createSession({ model: "gpt-4.1" });

  try {
    const response: AssistantMessageEvent | undefined =
      await session.sendAndWait({ prompt }, 120_000);
    return response?.data?.content ?? "";
  } finally {
    await session.destroy();
    await copilot.stop();
  }
}

/**
 * Send a prompt to Copilot and stream the response chunks.
 * Uses the authenticated user's token.
 */
export async function streamCopilot(
  accessToken: string,
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const copilot = getCopilotClient(accessToken);
  const session = await copilot.createSession({ model: "gpt-4.1" });

  let fullResponse = "";

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

  try {
    await session.sendAndWait({ prompt }, 120_000);
    return fullResponse;
  } finally {
    await session.destroy();
    await copilot.stop();
  }
}
