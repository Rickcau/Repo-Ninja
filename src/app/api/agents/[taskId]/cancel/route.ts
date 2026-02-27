import { NextResponse } from "next/server";
import { updateAgentTask, getAgentTask } from "@/lib/db/dal";
import { taskRunner } from "@/lib/services/task-runner";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = await getAgentTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.status !== "running" && task.status !== "queued") {
    return NextResponse.json({ error: "Task is not running" }, { status: 400 });
  }

  taskRunner.cancel(taskId);
  const updated = await updateAgentTask(taskId, {
    status: "cancelled",
    progressMessage: "Task cancelled by user",
  });

  return NextResponse.json({ task: updated });
}
