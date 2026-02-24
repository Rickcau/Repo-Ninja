import { existsSync, unlinkSync } from "fs";
import path from "path";
import os from "os";

// Set AGENT_STORE_PATH before importing the module so it uses our temp file
const TEMP_STORE = path.join(os.tmpdir(), `repo-ninja-test-${Date.now()}.json`);
process.env.AGENT_STORE_PATH = TEMP_STORE;

import { createTask, getTask, updateTask, listTasks } from "@/lib/agent-store";

afterEach(() => {
  // Clean up temp file between tests so each test starts fresh
  if (existsSync(TEMP_STORE)) {
    unlinkSync(TEMP_STORE);
  }
});

afterAll(() => {
  if (existsSync(TEMP_STORE)) {
    unlinkSync(TEMP_STORE);
  }
});

describe("createTask", () => {
  it("creates a task with the correct fields", () => {
    const task = createTask("issue-solver", "owner/repo", "Fix the login bug");

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

  it("persists the task to the store", () => {
    const task = createTask("code-review", "owner/repo", "Review PR #5");
    const retrieved = getTask(task.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(task.id);
    expect(retrieved!.description).toBe("Review PR #5");
  });
});

describe("getTask", () => {
  it("returns null for a non-existent ID", () => {
    expect(getTask("non-existent-id")).toBeNull();
  });

  it("retrieves a task by ID", () => {
    const task = createTask("code-writer", "owner/repo", "Write utility");
    const result = getTask(task.id);

    expect(result).not.toBeNull();
    expect(result!.type).toBe("code-writer");
  });
});

describe("updateTask", () => {
  it("returns null when updating a non-existent task", () => {
    const result = updateTask("does-not-exist", { status: "running" });
    expect(result).toBeNull();
  });

  it("updates the task status", () => {
    const task = createTask("issue-solver", "owner/repo", "Fix bug");
    const updated = updateTask(task.id, { status: "running" });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("running");
  });

  it("adds a progress message", () => {
    const task = createTask("issue-solver", "owner/repo", "Fix bug");
    updateTask(task.id, { progressMessage: "Cloning repository..." });
    const updated = updateTask(task.id, { progressMessage: "Analyzing code..." });

    expect(updated!.progress).toContain("Cloning repository...");
    expect(updated!.progress).toContain("Analyzing code...");
    expect(updated!.progress).toHaveLength(2);
  });

  it("updates branch and prUrl", () => {
    const task = createTask("code-writer", "owner/repo", "Write feature");
    const updated = updateTask(task.id, {
      branch: "feat/new-feature",
      prUrl: "https://github.com/owner/repo/pull/10",
    });

    expect(updated!.branch).toBe("feat/new-feature");
    expect(updated!.prUrl).toBe("https://github.com/owner/repo/pull/10");
  });

  it("updates the updatedAt timestamp", () => {
    const task = createTask("issue-solver", "owner/repo", "Fix bug");
    const originalUpdatedAt = task.updatedAt;

    // Small delay to ensure timestamp difference
    const updated = updateTask(task.id, { status: "completed" });
    expect(updated!.updatedAt).toBeDefined();
    // updatedAt should be >= original (may be same if executed within same ms)
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime()
    );
  });
});

describe("listTasks", () => {
  it("returns all tasks when no filter is provided", () => {
    createTask("issue-solver", "owner/repo", "Task 1");
    createTask("code-review", "owner/repo", "Task 2");
    createTask("code-writer", "owner/repo", "Task 3");

    const tasks = listTasks();
    expect(tasks).toHaveLength(3);
  });

  it("filters by type", () => {
    createTask("issue-solver", "owner/repo", "Solver task");
    createTask("code-review", "owner/repo", "Review task");
    createTask("issue-solver", "owner/repo", "Another solver");

    const result = listTasks({ type: "issue-solver" });
    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.type).toBe("issue-solver"));
  });

  it("filters by status", () => {
    const t1 = createTask("issue-solver", "owner/repo", "Task 1");
    createTask("code-review", "owner/repo", "Task 2");
    updateTask(t1.id, { status: "running" });

    const running = listTasks({ status: "running" });
    expect(running).toHaveLength(1);
    expect(running[0].id).toBe(t1.id);
  });

  it("filters by both type and status", () => {
    const t1 = createTask("issue-solver", "owner/repo", "Solver 1");
    createTask("issue-solver", "owner/repo", "Solver 2");
    createTask("code-review", "owner/repo", "Review 1");
    updateTask(t1.id, { status: "completed" });

    const result = listTasks({ type: "issue-solver", status: "completed" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(t1.id);
  });

  it("returns tasks sorted by updatedAt descending", () => {
    const t1 = createTask("issue-solver", "owner/repo", "First");
    const t2 = createTask("code-review", "owner/repo", "Second");
    // Update t1 so its updatedAt is newer
    updateTask(t1.id, { progressMessage: "updated" });

    const tasks = listTasks();
    expect(tasks[0].id).toBe(t1.id);
  });

  it("returns empty array when store file does not exist", () => {
    // Store was cleaned in afterEach, so no file exists
    const tasks = listTasks();
    expect(tasks).toEqual([]);
  });
});
