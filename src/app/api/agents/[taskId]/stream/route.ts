import { getAgentTask } from "@/lib/db/dal";

const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let attempts = 0;
      const maxAttempts = 300; // 10 minutes at 2s intervals

      const poll = async () => {
        attempts++;
        const task = await getAgentTask(taskId);

        if (!task) {
          sendEvent({ error: "Task not found" });
          controller.close();
          return;
        }

        sendEvent(task);

        if (TERMINAL_STATUSES.includes(task.status) || attempts >= maxAttempts) {
          controller.close();
          return;
        }

        setTimeout(poll, 2000);
      };

      await poll();
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
