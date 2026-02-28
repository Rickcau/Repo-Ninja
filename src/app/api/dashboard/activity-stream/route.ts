import { listAgentTasks } from "@/lib/db/dal";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial state
      try {
        const result = await listAgentTasks(undefined, { page: 1, pageSize: 10 });
        send({ type: "initial", tasks: result.items, total: result.total });
      } catch {
        send({ type: "error", message: "Failed to fetch tasks" });
      }

      // Poll every 3 seconds for updates
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const result = await listAgentTasks(undefined, { page: 1, pageSize: 10 });
          send({ type: "update", tasks: result.items, total: result.total });
        } catch {
          // Silently skip failed polls
        }
      }, 3000);

      // Clean up after 5 minutes to prevent resource leaks
      setTimeout(() => {
        clearInterval(interval);
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 300_000);
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
