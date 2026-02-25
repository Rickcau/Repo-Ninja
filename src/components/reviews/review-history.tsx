"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";

// TODO: Replace with real API data
export interface ReviewHistoryEntry {
  id: string;
  repo: string;
  reviewTypes: string[];
  status: "complete" | "in-progress" | "failed";
  date: string;
  findings: {
    critical: number;
    warning: number;
    info: number;
  };
  score: number;
}

const statusConfig: Record<
  ReviewHistoryEntry["status"],
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  complete: { icon: CheckCircle2, color: "text-green-500", label: "Complete" },
  "in-progress": { icon: Clock, color: "text-blue-500", label: "In Progress" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
};

// TODO: Replace with real API data
const MOCK_HISTORY: ReviewHistoryEntry[] = [
  {
    id: "rev-001",
    repo: "acme/web-app",
    reviewTypes: ["security", "general"],
    status: "complete",
    date: "2026-02-25T14:30:00Z",
    findings: { critical: 2, warning: 5, info: 3 },
    score: 7.2,
  },
  {
    id: "rev-002",
    repo: "acme/api-service",
    reviewTypes: ["performance"],
    status: "complete",
    date: "2026-02-24T10:15:00Z",
    findings: { critical: 0, warning: 3, info: 8 },
    score: 8.5,
  },
  {
    id: "rev-003",
    repo: "acme/mobile-sdk",
    reviewTypes: ["security", "accessibility"],
    status: "in-progress",
    date: "2026-02-25T16:00:00Z",
    findings: { critical: 0, warning: 0, info: 0 },
    score: 0,
  },
  {
    id: "rev-004",
    repo: "acme/data-pipeline",
    reviewTypes: ["general"],
    status: "failed",
    date: "2026-02-23T09:00:00Z",
    findings: { critical: 0, warning: 0, info: 0 },
    score: 0,
  },
  {
    id: "rev-005",
    repo: "acme/auth-lib",
    reviewTypes: ["security"],
    status: "complete",
    date: "2026-02-22T11:45:00Z",
    findings: { critical: 4, warning: 2, info: 1 },
    score: 5.8,
  },
];

interface ReviewHistoryProps {
  onSelectReview?: (entry: ReviewHistoryEntry) => void;
}

export function ReviewHistory({ onSelectReview }: ReviewHistoryProps) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review History</CardTitle>
        <CardDescription>Past code reviews and their results.</CardDescription>
      </CardHeader>
      <CardContent>
        {MOCK_HISTORY.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No reviews yet. Start your first review above.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {MOCK_HISTORY.map((entry) => {
              const status = statusConfig[entry.status];
              const StatusIcon = status.icon;
              const totalFindings =
                entry.findings.critical +
                entry.findings.warning +
                entry.findings.info;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectReview?.(entry)}
                  className="w-full text-left py-4 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors group"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: repo info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${status.color} shrink-0`} />
                        <span className="text-sm font-medium truncate">
                          {entry.repo}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {entry.reviewTypes.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                      </p>
                    </div>

                    {/* Right: findings + score */}
                    <div className="flex items-center gap-4 shrink-0">
                      {entry.status === "complete" && (
                        <>
                          <div className="flex items-center gap-3 text-xs">
                            {entry.findings.critical > 0 && (
                              <span className="flex items-center gap-1 text-red-500">
                                <ShieldAlert className="h-3 w-3" />
                                {entry.findings.critical}
                              </span>
                            )}
                            {entry.findings.warning > 0 && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <AlertTriangle className="h-3 w-3" />
                                {entry.findings.warning}
                              </span>
                            )}
                            {entry.findings.info > 0 && (
                              <span className="flex items-center gap-1 text-indigo-500">
                                <Info className="h-3 w-3" />
                                {entry.findings.info}
                              </span>
                            )}
                            {totalFindings === 0 && (
                              <span className="text-muted-foreground">
                                No findings
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold tabular-nums w-8 text-right">
                            {entry.score.toFixed(1)}
                          </div>
                        </>
                      )}
                      {entry.status === "in-progress" && (
                        <span className="text-xs text-blue-500">Running...</span>
                      )}
                      {entry.status === "failed" && (
                        <span className="text-xs text-red-500">Error</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
