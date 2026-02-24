import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentTaskStatus } from "@/lib/types";

const statusStyles: Record<AgentTaskStatus, string> = {
  queued: "bg-muted text-muted-foreground border-border",
  running: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  cancelled: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

export function StatusBadge({ status }: { status: AgentTaskStatus }) {
  return (
    <Badge className={cn("capitalize", statusStyles[status])} variant="outline">
      {status}
    </Badge>
  );
}
