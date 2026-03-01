/**
 * Agent store — backed by Prisma via the DAL.
 * Maintains backward-compatible signatures but delegates to async DAL.
 */
import {
  createAgentTask as dalCreate,
  getAgentTask as dalGet,
  updateAgentTask as dalUpdate,
  listAgentTasks as dalList,
} from "@/lib/db/dal";
import type { AgentTask, AgentTaskType, AgentTaskStatus } from "@/lib/types";

export async function createTask(
  type: AgentTaskType,
  repo: string,
  description: string
): Promise<AgentTask> {
  return dalCreate(type, repo, description);
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<AgentTask, "status" | "branch" | "prUrl" | "result">> & {
    progressMessage?: string;
  }
): Promise<AgentTask | null> {
  return dalUpdate(id, updates);
}

export async function getTask(id: string): Promise<AgentTask | null> {
  return dalGet(id);
}

export async function listTasks(filter?: {
  type?: AgentTaskType;
  status?: AgentTaskStatus;
}): Promise<AgentTask[]> {
  const result = await dalList(filter, { page: 1, pageSize: 100 });
  return result.items;
}
