"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  GitBranch,
  Bot,
  FileSearch,
  ShieldCheck,
  Hammer,
  BookOpen,
  ExternalLink,
  Trash2,
} from "lucide-react";
import type { ActionType } from "@/lib/db/dal";

interface WorkHistoryEntry {
  id: string;
  userId?: string;
  actionType: ActionType;
  entityId?: string;
  repo?: string;
  summary: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

interface PaginatedResult {
  items: WorkHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  "code-review": "Code Review",
  "best-practices-audit": "Best Practices Audit",
  "scaffold-plan": "Scaffold Plan",
  "scaffold-create": "Scaffold Create",
  "agent-issue-solver": "Issue Solver",
  "agent-code-writer": "Code Writer",
  "agent-custom-task": "Custom Task",
  "kb-edit": "KB Edit",
  "kb-reindex": "KB Reindex",
};

const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  "code-review": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "best-practices-audit": "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "scaffold-plan": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "scaffold-create": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "agent-issue-solver": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "agent-code-writer": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "agent-custom-task": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "kb-edit": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "kb-reindex": "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const ACTION_TYPE_ICONS: Record<ActionType, React.ElementType> = {
  "code-review": FileSearch,
  "best-practices-audit": ShieldCheck,
  "scaffold-plan": Hammer,
  "scaffold-create": Hammer,
  "agent-issue-solver": Bot,
  "agent-code-writer": Bot,
  "agent-custom-task": Bot,
  "kb-edit": BookOpen,
  "kb-reindex": BookOpen,
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    running: "bg-primary/15 text-primary border-primary/30",
    started: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const color = colors[status] ?? "bg-muted/50 text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ALL_ACTION_TYPES: ActionType[] = [
  "code-review",
  "best-practices-audit",
  "scaffold-plan",
  "scaffold-create",
  "agent-issue-solver",
  "agent-code-writer",
  "kb-edit",
  "kb-reindex",
];

export default function ActivityPage() {
  const [data, setData] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(
    async (p: number, filter: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), pageSize: "15" });
        if (filter !== "all") params.set("actionType", filter);
        const res = await fetch(`/api/history?${params}`);
        if (res.ok) {
          const json: PaginatedResult = await res.json();
          setData(json);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchHistory(page, actionTypeFilter);
  }, [page, actionTypeFilter, fetchHistory]);

  function handleFilterChange(value: string) {
    setActionTypeFilter(value);
    setPage(1);
  }

  function handleRefresh() {
    fetchHistory(page, actionTypeFilter, true);
  }

  async function handleClearHistory() {
    if (!confirm("Clear all activity history? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (res.ok) {
        setPage(1);
        fetchHistory(1, actionTypeFilter);
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Activity</h1>
            <p className="text-sm text-muted-foreground">
              Work history for all agent tasks, reviews, scaffolds, and knowledge base operations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            disabled={loading || !data || data.total === 0}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={actionTypeFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            {ALL_ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ACTION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <History className="h-8 w-8 opacity-40" />
              <p className="text-sm">No activity yet.</p>
              <p className="text-xs">Start a review, scaffold, or agent task to see history here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.items.map((entry) => {
                const Icon = ACTION_TYPE_ICONS[entry.actionType] ?? Bot;
                const repoUrl = typeof entry.metadata.repoUrl === "string" ? entry.metadata.repoUrl : null;
                const prUrl = typeof entry.metadata.prUrl === "string" ? entry.metadata.prUrl : null;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Action type icon */}
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-md bg-muted/50">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ACTION_TYPE_COLORS[entry.actionType]}`}
                        >
                          {ACTION_TYPE_LABELS[entry.actionType]}
                        </span>
                        <StatusBadge status={entry.status} />
                      </div>
                      <p className="text-sm text-foreground truncate">{entry.summary}</p>
                      {entry.repo && (
                        <div className="flex items-center gap-1 mt-1">
                          <GitBranch className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">{entry.repo}</span>
                        </div>
                      )}
                      {(repoUrl || prUrl) && (
                        <div className="flex items-center gap-3 mt-1.5">
                          {repoUrl && (
                            <a
                              href={repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Repository
                            </a>
                          )}
                          {prUrl && (
                            <a
                              href={prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Pull Request
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: status icon + time */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={entry.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(entry.startedAt)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground/60">
                        {formatDuration(entry.startedAt, entry.completedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
