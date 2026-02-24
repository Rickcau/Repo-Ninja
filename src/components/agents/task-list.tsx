"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { AgentTask } from "@/lib/types";

interface TaskListProps {
  refreshTrigger?: number;
}

export function TaskList({ refreshTrigger }: TaskListProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/agents/tasks");
        if (!res.ok) return;
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch {
        // Silently fail - tasks list is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No agent tasks yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Repo</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>PR</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Badge variant="outline" className="capitalize text-xs">
                {task.type.replace("-", " ")}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">{task.repo}</TableCell>
            <TableCell className="max-w-xs truncate">{task.description}</TableCell>
            <TableCell>
              <StatusBadge status={task.status} />
            </TableCell>
            <TableCell>
              {task.prUrl ? (
                <a
                  href={task.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View PR
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(task.updatedAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
