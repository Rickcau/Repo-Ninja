"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type TerminalStatus = "completed" | "failed" | "cancelled";
const TERMINAL: TerminalStatus[] = ["completed", "failed", "cancelled"];

interface TaskStatusResult<T> {
  data: T | null;
  status: "idle" | "polling" | "completed" | "failed";
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Generic polling hook for background tasks.
 * Polls a URL at a given interval and stops when a terminal status is detected.
 * The response body must include a `status` field.
 */
export function useTaskStatus<T extends { status?: string }>(
  url: string | null,
  pollIntervalMs = 3000
): TaskStatusResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<TaskStatusResult<T>["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!urlRef.current) return;
    try {
      const res = await fetch(urlRef.current);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setStatus("failed");
        stopPolling();
        return;
      }
      const json = (await res.json()) as T;
      setData(json);

      const taskStatus = (json as Record<string, unknown>).status as string | undefined;
      if (taskStatus && TERMINAL.includes(taskStatus as TerminalStatus)) {
        setStatus(taskStatus === "completed" ? "completed" : "failed");
        stopPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("failed");
      stopPolling();
    }
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setStatus("polling");
    setError(null);
    // Immediate first poll
    poll();
    intervalRef.current = setInterval(poll, pollIntervalMs);
  }, [poll, pollIntervalMs, stopPolling]);

  // Clean up on unmount
  useEffect(() => stopPolling, [stopPolling]);

  // Auto-start when URL changes
  useEffect(() => {
    if (url) {
      startPolling();
    } else {
      stopPolling();
      setStatus("idle");
    }
    return stopPolling;
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, status, error, startPolling, stopPolling };
}
