import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentTaskStatus } from "@/lib/types";

const statusStyles: Record<
  AgentTaskStatus,
  { dot: string; badge: string }
> = {
  queued: {
    dot: "bg-muted-foreground",
    badge: "bg-surface-raised text-muted-foreground border-border",
  },
  running: {
    dot: "bg-violet-500",
    badge:
      "bg-violet-500/[0.12] text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  completed: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  failed: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  cancelled: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-500/[0.12] text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

export function StatusBadge({ status }: { status: AgentTaskStatus }) {
  const style = statusStyles[status];

  return (
    <Badge
      className={cn("capitalize gap-1.5", style.badge)}
      variant="outline"
    >
      <span
        className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", style.dot)}
      />
      {status}
    </Badge>
  );
}
