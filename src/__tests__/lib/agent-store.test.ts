/**
 * Agent store tests — mocks the DAL layer to avoid Prisma/import.meta issues.
 */
import type { AgentTask, AgentTaskType, AgentTaskStatus } from "@/lib/types";

// In-memory store for mocking
const store = new Map<string, AgentTask>();
let idCounter = 0;

jest.mock("@/lib/db/dal", () => ({
  createAgentTask: async (type: AgentTaskType, repo: string, description: string): Promise<AgentTask> => {
    idCounter++;
    const task: AgentTask = {
      id: `mock-id-${idCounter}`,
      type,
      status: "queued",
      repo,
      description,
      progress: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set(task.id, task);
    return task;
  },
  getAgentTask: async (id: string): Promise<AgentTask | null> => {
    return store.get(id) ?? null;
  },
  updateAgentTask: async (
    id: string,
    updates: Partial<Pick<AgentTask, "status" | "branch" | "prUrl" | "result">> & { progressMessage?: string }
  ): Promise<AgentTask | null> => {
    const task = store.get(id);
    if (!task) return null;
    if (updates.status) task.status = updates.status;
    if (updates.branch) task.branch = updates.branch;
    if (updates.prUrl) task.prUrl = updates.prUrl;
    if (updates.result) task.result = updates.result;
    if (updates.progressMessage) task.progress.push(updates.progressMessage);
    task.updatedAt = new Date().toISOString();
    store.set(id, task);
    return task;
  },
  listAgentTasks: async (
    filter?: { type?: AgentTaskType; status?: AgentTaskStatus },
    _pagination?: { page?: number; pageSize?: number }
  ) => {
    let items = Array.from(store.values());
    if (filter?.type) items = items.filter((t) => t.type === filter.type);
    if (filter?.status) items = items.filter((t) => t.status === filter.status);
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { items, total: items.length };
  },
}));

import { createTask, getTask, updateTask, listTasks } from "@/lib/agent-store";

beforeEach(() => {
  store.clear();
  idCounter = 0;
});

describe("createTask", () => {
  it("creates a task with the correct fields", async () => {
    const task = await createTask("issue-solver", "owner/repo", "Fix the login bug");

    expect(task.id).toBeDefined();
    expect(typeof task.id).toBe("string");
    expect(task.type).toBe("issue-solver");
    expect(task.status).toBe("queued");
    expect(task.repo).toBe("owner/repo");
    expect(task.description).toBe("Fix the login bug");
    expect(task.progress).toEqual([]);
    expect(task.createdAt).toBeDefined();
    expect(task.updatedAt).toBeDefined();
  });

  it("persists the task to the store", async () => {
    const task = await createTask("code-review", "owner/repo", "Review PR #5");
    const retrieved = await getTask(task.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(task.id);
    expect(retrieved!.description).toBe("Review PR #5");
  });
});

describe("getTask", () => {
  it("returns null for a non-existent ID", async () => {
    expect(await getTask("non-existent-id")).toBeNull();
  });

  it("retrieves a task by ID", async () => {
    const task = await createTask("code-writer", "owner/repo", "Write utility");
    const result = await getTask(task.id);

    expect(result).not.toBeNull();
    expect(result!.type).toBe("code-writer");
  });
});

describe("updateTask", () => {
  it("returns null when updating a non-existent task", async () => {
    const result = await updateTask("does-not-exist", { status: "running" });
    expect(result).toBeNull();
  });

  it("updates the task status", async () => {
    const task = await createTask("issue-solver", "owner/repo", "Fix bug");
    const updated = await updateTask(task.id, { status: "running" });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("running");
  });

  it("adds a progress message", async () => {
    const task = await createTask("issue-solver", "owner/repo", "Fix bug");
    await updateTask(task.id, { progressMessage: "Cloning repository..." });
    const updated = await updateTask(task.id, { progressMessage: "Analyzing code..." });

    expect(updated!.progress).toContain("Cloning repository...");
    expect(updated!.progress).toContain("Analyzing code...");
    expect(updated!.progress).toHaveLength(2);
  });

  it("updates branch and prUrl", async () => {
    const task = await createTask("code-writer", "owner/repo", "Write feature");
    const updated = await updateTask(task.id, {
      branch: "feat/new-feature",
      prUrl: "https://github.com/owner/repo/pull/10",
    });

    expect(updated!.branch).toBe("feat/new-feature");
    expect(updated!.prUrl).toBe("https://github.com/owner/repo/pull/10");
  });

  it("updates the updatedAt timestamp", async () => {
    const task = await createTask("issue-solver", "owner/repo", "Fix bug");
    const originalUpdatedAt = task.updatedAt;

    const updated = await updateTask(task.id, { status: "completed" });
    expect(updated!.updatedAt).toBeDefined();
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime()
    );
  });
});

describe("listTasks", () => {
  it("returns all tasks when no filter is provided", async () => {
    await createTask("issue-solver", "owner/repo", "Task 1");
    await createTask("code-review", "owner/repo", "Task 2");
    await createTask("code-writer", "owner/repo", "Task 3");

    const tasks = await listTasks();
    expect(tasks.length).toBe(3);
  });

  it("filters by type", async () => {
    await createTask("issue-solver", "owner/repo", "Solver task");
    await createTask("code-review", "owner/repo", "Review task");
    await createTask("issue-solver", "owner/repo", "Another solver");

    const result = await listTasks({ type: "issue-solver" });
    expect(result.length).toBe(2);
    result.forEach((t) => expect(t.type).toBe("issue-solver"));
  });

  it("filters by status", async () => {
    const t1 = await createTask("issue-solver", "owner/repo", "Task 1");
    await createTask("code-review", "owner/repo", "Task 2");
    await updateTask(t1.id, { status: "running" });

    const running = await listTasks({ status: "running" });
    expect(running.length).toBe(1);
    expect(running[0].id).toBe(t1.id);
  });

  it("filters by both type and status", async () => {
    const t1 = await createTask("issue-solver", "owner/repo", "Solver 1");
    await createTask("issue-solver", "owner/repo", "Solver 2");
    await createTask("code-review", "owner/repo", "Review 1");
    await updateTask(t1.id, { status: "completed" });

    const result = await listTasks({ type: "issue-solver", status: "completed" });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(t1.id);
  });

  it("returns tasks sorted by updatedAt descending", async () => {
    const t1 = await createTask("issue-solver", "owner/repo", "First");
    await createTask("code-review", "owner/repo", "Second");
    await updateTask(t1.id, { progressMessage: "updated" });

    const tasks = await listTasks();
    expect(tasks[0].id).toBe(t1.id);
  });
});
