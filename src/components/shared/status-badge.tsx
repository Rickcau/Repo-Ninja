import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentTaskStatus } from "@/lib/types";

const statusStyles: Record<AgentTaskStatus, string> = {
  queued: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-700",
};

export function StatusBadge({ status }: { status: AgentTaskStatus }) {
  return (
    <Badge className={cn("capitalize", statusStyles[status])} variant="outline">
      {status}
    </Badge>
  );
}
