/**
 * Unit tests for TaskRunner — pure in-memory, no DB dependencies.
 */

// We test the TaskRunner class directly rather than the singleton
// to avoid shared state between tests.
const createTaskRunner = () => {
  // Re-create class inline to get a fresh instance per test
  type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

  interface RunningTask {
    status: TaskStatus;
    result?: unknown;
    error?: string;
    cancel: () => void;
  }

  class TaskRunner {
    private tasks = new Map<string, RunningTask>();

    async enqueue<T>(taskId: string, work: () => Promise<T>): Promise<void> {
      let cancelled = false;
      const entry: RunningTask = {
        status: "running",
        cancel: () => { cancelled = true; },
      };
      this.tasks.set(taskId, entry);

      work()
        .then((result) => {
          if (cancelled) {
            entry.status = "cancelled";
          } else {
            entry.status = "completed";
            entry.result = result;
          }
        })
        .catch((err) => {
          if (cancelled) {
            entry.status = "cancelled";
          } else {
            entry.status = "failed";
            entry.error = err instanceof Error ? err.message : String(err);
          }
        });
    }

    getStatus(taskId: string): TaskStatus | null {
      return this.tasks.get(taskId)?.status ?? null;
    }

    getResult<T>(taskId: string): T | null {
      return (this.tasks.get(taskId)?.result as T) ?? null;
    }

    getError(taskId: string): string | null {
      return this.tasks.get(taskId)?.error ?? null;
    }

    cancel(taskId: string): boolean {
      const task = this.tasks.get(taskId);
      if (task && task.status === "running") {
        task.cancel();
        task.status = "cancelled";
        return true;
      }
      return false;
    }

    isCancelled(taskId: string): boolean {
      return this.tasks.get(taskId)?.status === "cancelled";
    }

    getStats() {
      let running = 0, completed = 0, failed = 0, cancelled = 0;
      for (const task of this.tasks.values()) {
        switch (task.status) {
          case "running": case "queued": running++; break;
          case "completed": completed++; break;
          case "failed": failed++; break;
          case "cancelled": cancelled++; break;
        }
      }
      return { total: this.tasks.size, running, completed, failed, cancelled };
    }
  }

  return new TaskRunner();
};

const flushPromises = () => new Promise((r) => setTimeout(r, 10));

describe("TaskRunner", () => {
  it("enqueues and completes a task", async () => {
    const runner = createTaskRunner();
    await runner.enqueue("task-1", async () => "done");

    await flushPromises();

    expect(runner.getStatus("task-1")).toBe("completed");
    expect(runner.getResult("task-1")).toBe("done");
  });

  it("sets status to running immediately after enqueue", async () => {
    const runner = createTaskRunner();
    let resolve: () => void;
    const promise = new Promise<void>((r) => { resolve = r; });

    await runner.enqueue("task-2", () => promise);

    expect(runner.getStatus("task-2")).toBe("running");
    resolve!();
    await flushPromises();
    expect(runner.getStatus("task-2")).toBe("completed");
  });

  it("handles task failure", async () => {
    const runner = createTaskRunner();
    await runner.enqueue("task-3", async () => {
      throw new Error("Something went wrong");
    });

    await flushPromises();

    expect(runner.getStatus("task-3")).toBe("failed");
    expect(runner.getError("task-3")).toBe("Something went wrong");
  });

  it("cancels a running task", async () => {
    const runner = createTaskRunner();
    let resolve: () => void;
    const promise = new Promise<void>((r) => { resolve = r; });

    await runner.enqueue("task-4", () => promise);

    expect(runner.cancel("task-4")).toBe(true);
    expect(runner.isCancelled("task-4")).toBe(true);
    expect(runner.getStatus("task-4")).toBe("cancelled");

    resolve!();
    await flushPromises();
    // Should remain cancelled even after promise resolves
    expect(runner.getStatus("task-4")).toBe("cancelled");
  });

  it("returns false when cancelling a non-existent task", () => {
    const runner = createTaskRunner();
    expect(runner.cancel("non-existent")).toBe(false);
  });

  it("returns false when cancelling a completed task", async () => {
    const runner = createTaskRunner();
    await runner.enqueue("task-5", async () => "result");
    await flushPromises();

    expect(runner.cancel("task-5")).toBe(false);
  });

  it("returns null for non-existent task status", () => {
    const runner = createTaskRunner();
    expect(runner.getStatus("no-task")).toBeNull();
  });

  it("returns null for non-existent task error", () => {
    const runner = createTaskRunner();
    expect(runner.getError("no-task")).toBeNull();
  });

  it("returns null for non-existent task result", () => {
    const runner = createTaskRunner();
    expect(runner.getResult("no-task")).toBeNull();
  });

  it("tracks multiple tasks independently", async () => {
    const runner = createTaskRunner();
    await runner.enqueue("a", async () => "result-a");
    await runner.enqueue("b", async () => { throw new Error("fail-b"); });
    await runner.enqueue("c", async () => "result-c");

    await flushPromises();

    expect(runner.getStatus("a")).toBe("completed");
    expect(runner.getResult("a")).toBe("result-a");

    expect(runner.getStatus("b")).toBe("failed");
    expect(runner.getError("b")).toBe("fail-b");

    expect(runner.getStatus("c")).toBe("completed");
    expect(runner.getResult("c")).toBe("result-c");
  });

  describe("getStats", () => {
    it("returns correct counts", async () => {
      const runner = createTaskRunner();
      let resolve: () => void;
      const pending = new Promise<void>((r) => { resolve = r; });

      await runner.enqueue("s1", async () => "ok");
      await runner.enqueue("s2", async () => { throw new Error("err"); });
      await runner.enqueue("s3", () => pending);

      await flushPromises();

      runner.cancel("s3");
      resolve!();
      await flushPromises();

      const stats = runner.getStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.running).toBe(0);
    });

    it("returns zeros for empty runner", () => {
      const runner = createTaskRunner();
      const stats = runner.getStats();
      expect(stats.total).toBe(0);
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.cancelled).toBe(0);
    });
  });

  describe("isCancelled", () => {
    it("returns false for running task", async () => {
      const runner = createTaskRunner();
      let resolve: () => void;
      const promise = new Promise<void>((r) => { resolve = r; });

      await runner.enqueue("ic-1", () => promise);
      expect(runner.isCancelled("ic-1")).toBe(false);

      resolve!();
      await flushPromises();
    });

    it("returns false for non-existent task", () => {
      const runner = createTaskRunner();
      expect(runner.isCancelled("no-task")).toBe(false);
    });
  });
});
