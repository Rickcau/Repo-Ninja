import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTasks } from "@/lib/agent-store";
import { clearAgentTasks } from "@/lib/db/dal";
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

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = await clearAgentTasks();
  return NextResponse.json({ deleted });
}
