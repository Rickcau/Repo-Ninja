"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonText } from "@/components/shared/skeleton-loader";
import {
  FileSearch,
  ShieldCheck,
  Code,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { AgentTask } from "@/lib/types";

const agentIcons: Record<string, typeof FileSearch> = {
  "code-review": FileSearch,
  "best-practices-audit": ShieldCheck,
  "code-writer": Code,
  "issue-solver": Code,
};

const statusConfig = {
  running: {
    color: "bg-blue-500/[0.12] text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Clock,
    barColor: "bg-blue-500",
    label: "Running",
  },
  completed: {
    color: "bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
    barColor: "bg-emerald-500",
    label: "Done",
  },
  failed: {
    color: "bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: XCircle,
    barColor: "bg-rose-500",
    label: "Failed",
  },
  queued: {
    color: "bg-gray-500/[0.12] text-gray-600 dark:text-gray-400 border-gray-500/20",
    icon: Clock,
    barColor: "bg-gray-500",
    label: "Queued",
  },
  cancelled: {
    color: "bg-amber-500/[0.12] text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: XCircle,
    barColor: "bg-amber-500",
    label: "Cancelled",
  },
};

function getProgress(task: AgentTask): number {
  if (task.status === "completed") return 100;
  if (task.status === "failed" || task.status === "cancelled") return Math.min(90, task.progress.length * 15);
  return Math.min(95, task.progress.length * 16);
}

function getElapsed(task: AgentTask): string {
  const start = new Date(task.createdAt).getTime();
  const end = task.status === "running" ? Date.now() : new Date(task.updatedAt).getTime();
  const diff = Math.floor((end - start) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

export function AgentActivityFeed() {
  const [activities, setActivities] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/agents/tasks");
        if (res.ok) {
          const json = await res.json();
          const tasks: AgentTask[] = json.tasks || [];
          setActivities(tasks.slice(0, 5));
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Agent Activity</CardTitle></CardHeader>
        <CardContent><SkeletonText lines={3} /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Agent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No agent activity yet.
          </p>
        ) : (
          activities.map((task) => {
            const AgentIcon = agentIcons[task.type] || Code;
            const config = statusConfig[task.status] || statusConfig.queued;
            const StatusIcon = config.icon;
            const progress = getProgress(task);
            const lastStep = task.progress[task.progress.length - 1] || task.description;

            return (
              <Link
                key={task.id}
                href="/agents"
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    <AgentIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{task.description}</p>
                      <Badge variant="outline" className={config.color}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{task.repo}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Step {task.progress.length}/6</span>
                      <span className="text-border">|</span>
                      <span className="truncate">{lastStep}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${config.barColor}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                        {progress}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getElapsed(task)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
