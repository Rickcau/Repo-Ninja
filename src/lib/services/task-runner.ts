/**
 * Background task runner — enqueues async work and tracks its lifecycle.
 * Tasks run in the background without blocking the HTTP response.
 */

type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

interface RunningTask {
  status: TaskStatus;
  result?: unknown;
  error?: string;
  cancel: () => void;
}

class TaskRunner {
  private tasks = new Map<string, RunningTask>();

  /**
   * Enqueue work to run in the background. Returns immediately.
   * The work function is fire-and-forget — do NOT await the returned promise.
   */
  async enqueue<T>(taskId: string, work: () => Promise<T>): Promise<void> {
    let cancelled = false;
    const entry: RunningTask = {
      status: "running",
      cancel: () => { cancelled = true; },
    };
    this.tasks.set(taskId, entry);

    // Fire and forget — intentionally not awaited
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
}

export const taskRunner = new TaskRunner();
