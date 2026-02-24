import { readFileSync, writeFileSync, existsSync } from "fs";
import { nanoid } from "nanoid";
import type { AgentTask, AgentTaskType, AgentTaskStatus } from "@/lib/types";

const STORE_PATH = process.env.AGENT_STORE_PATH || "/tmp/repo-ninja-agents.json";

function loadTasks(): AgentTask[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveTasks(tasks: AgentTask[]): void {
  writeFileSync(STORE_PATH, JSON.stringify(tasks, null, 2));
}

export function createTask(
  type: AgentTaskType,
  repo: string,
  description: string
): AgentTask {
  const tasks = loadTasks();
  const task: AgentTask = {
    id: nanoid(),
    type,
    status: "queued",
    repo,
    description,
    progress: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(
  id: string,
  updates: Partial<Pick<AgentTask, "status" | "branch" | "prUrl" | "result">> & {
    progressMessage?: string;
  }
): AgentTask | null {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;

  if (updates.status) task.status = updates.status;
  if (updates.branch) task.branch = updates.branch;
  if (updates.prUrl) task.prUrl = updates.prUrl;
  if (updates.result) task.result = updates.result;
  if (updates.progressMessage) task.progress.push(updates.progressMessage);
  task.updatedAt = new Date().toISOString();

  saveTasks(tasks);
  return task;
}

export function getTask(id: string): AgentTask | null {
  return loadTasks().find((t) => t.id === id) || null;
}

export function listTasks(filter?: {
  type?: AgentTaskType;
  status?: AgentTaskStatus;
}): AgentTask[] {
  let tasks = loadTasks();
  if (filter?.type) tasks = tasks.filter((t) => t.type === filter.type);
  if (filter?.status) tasks = tasks.filter((t) => t.status === filter.status);
  return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
