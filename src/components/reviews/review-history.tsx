"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SkeletonLoader } from "@/components/shared/skeleton-loader";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";

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
  reportType?: "review" | "audit";
}

const statusConfig: Record<
  ReviewHistoryEntry["status"],
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  complete: { icon: CheckCircle2, color: "text-green-500", label: "Complete" },
  "in-progress": { icon: Clock, color: "text-blue-500", label: "In Progress" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
};

interface ReviewHistoryProps {
  onSelectReview?: (entry: ReviewHistoryEntry) => void;
}

export function ReviewHistory({ onSelectReview }: ReviewHistoryProps) {
  const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reviews/history")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        const entries: ReviewHistoryEntry[] = (data.items || []).map(
          (item: Record<string, unknown>) => {
            const findings = (item.findings as Array<{ severity: string }>) || [];
            return {
              id: item.id as string,
              repo: item.repo as string,
              reviewTypes: (item.reviewTypes as string[]) || [],
              status:
                (item.status as string) === "running"
                  ? ("in-progress" as const)
                  : (item.status as string) === "failed"
                  ? ("failed" as const)
                  : ("complete" as const),
              date: (item.createdAt as string) || new Date().toISOString(),
              findings: {
                critical: findings.filter((f) => f.severity === "high").length,
                warning: findings.filter((f) => f.severity === "medium").length,
                info: findings.filter((f) => f.severity === "low" || f.severity === "info").length,
              },
              score: (item.overallScore as number) || (item.complianceScore as number) || 0,
              reportType: item.reportType as "review" | "audit" | undefined,
            };
          }
        );
        setHistory(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
          <CardDescription>Past code reviews and their results.</CardDescription>
        </CardHeader>
        <CardContent><SkeletonLoader lines={4} /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review History</CardTitle>
        <CardDescription>Past code reviews and their results.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No reviews yet. Start your first review above.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {history.map((entry) => {
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
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${status.color} shrink-0`} />
                        <span className="text-sm font-medium truncate">{entry.repo}</span>
                        <div className="flex gap-1 flex-wrap">
                          {entry.reviewTypes.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 h-5">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {entry.status === "complete" && (
                        <>
                          <div className="flex items-center gap-3 text-xs">
                            {entry.findings.critical > 0 && (
                              <span className="flex items-center gap-1 text-red-500">
                                <ShieldAlert className="h-3 w-3" />{entry.findings.critical}
                              </span>
                            )}
                            {entry.findings.warning > 0 && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <AlertTriangle className="h-3 w-3" />{entry.findings.warning}
                              </span>
                            )}
                            {entry.findings.info > 0 && (
                              <span className="flex items-center gap-1 text-indigo-500">
                                <Info className="h-3 w-3" />{entry.findings.info}
                              </span>
                            )}
                            {totalFindings === 0 && (
                              <span className="text-muted-foreground">No findings</span>
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
