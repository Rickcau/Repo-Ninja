"use client";

import { CheckCircle2, Circle, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StepStatus = "complete" | "in-progress" | "pending";

export interface TimelineStep {
  id: string;
  name: string;
  description: string;
  status: StepStatus;
  durationMs?: number;
  /** KB documents retrieved during this step (relevant for "Query knowledge base" step) */
  retrievedDocs?: { name: string; section: string; score: number }[];
}

interface ExecutionTimelineProps {
  steps: TimelineStep[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "in-progress":
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    case "pending":
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  return (
    <div className="relative space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative flex gap-3">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[7px] top-6 w-px h-[calc(100%-8px)]",
                  step.status === "complete"
                    ? "bg-emerald-500/30"
                    : "bg-border"
                )}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 mt-1">
              <StepIcon status={step.status} />
            </div>

            {/* Content */}
            <div className={cn("pb-6 flex-1 min-w-0", isLast && "pb-0")}>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                {step.durationMs !== undefined && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDuration(step.durationMs)}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>

              {/* Progress bar for in-progress steps */}
              {step.status === "in-progress" && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary animate-pulse"
                    style={{ width: "60%" }}
                  />
                </div>
              )}

              {/* Retrieved KB documents */}
              {step.retrievedDocs && step.retrievedDocs.length > 0 && (
                <div className="mt-2 space-y-1">
                  {step.retrievedDocs.map((doc) => (
                    <div
                      key={doc.name + doc.section}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{doc.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 shrink-0"
                      >
                        {doc.section}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                        {(doc.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
