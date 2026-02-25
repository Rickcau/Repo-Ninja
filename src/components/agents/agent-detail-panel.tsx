"use client";

import { Pause, Square, FileText, GitPullRequest, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ExecutionTimeline,
  type TimelineStep,
} from "@/components/agents/execution-timeline";
import type { AgentTaskStatus } from "@/lib/types";

export interface KBReference {
  name: string;
  section: string;
}

export interface AgentTaskDetail {
  id: string;
  name: string;
  repo: string;
  status: AgentTaskStatus;
  type: string;
  createdAt: string;
  steps: TimelineStep[];
  groundedIn: KBReference[];
}

interface AgentDetailPanelProps {
  task: AgentTaskDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDetailPanel({
  task,
  open,
  onOpenChange,
}: AgentDetailPanelProps) {
  if (!task) return null;

  const isActive = task.status === "running" || task.status === "queued";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-base leading-tight">
                {task.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs">{task.repo}</span>
                <StatusBadge status={task.status} />
              </SheetDescription>
            </div>
          </div>

          {/* Controls for active tasks */}
          {isActive && (
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
          )}
        </SheetHeader>

        {/* Task metadata */}
        <div className="px-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Started {new Date(task.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitPullRequest className="h-3 w-3" />
            <span className="capitalize">{task.type.replace("-", " ")}</span>
          </div>
        </div>

        {/* Execution Timeline */}
        <div className="px-4 space-y-3">
          <h3 className="text-sm font-semibold">Execution Steps</h3>
          <ExecutionTimeline steps={task.steps} />
        </div>

        {/* Grounded In section */}
        <div className="px-4 pb-6 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Grounded In
          </h3>
          <p className="text-xs text-muted-foreground">
            Knowledge base documents consulted during this task.
          </p>
          <div className="space-y-2">
            {task.groundedIn.map((doc) => (
              <div
                key={doc.name + doc.section}
                className="flex items-center gap-2 rounded-md border bg-surface-raised px-3 py-2"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {doc.section}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="ml-auto text-[10px] px-1.5 py-0 shrink-0"
                >
                  KB
                </Badge>
              </div>
            ))}
            {task.groundedIn.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No KB documents consulted yet.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
