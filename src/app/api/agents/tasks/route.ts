import { NextResponse } from "next/server";
import { listTasks } from "@/lib/agent-store";
import type { AgentTaskType, AgentTaskStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as AgentTaskType | null;
  const status = searchParams.get("status") as AgentTaskStatus | null;

  const tasks = await listTasks({
    type: type || undefined,
    status: status || undefined,
  });

  return NextResponse.json({ tasks });
}
