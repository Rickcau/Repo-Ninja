"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FindingCard } from "./finding-card";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Star,
  Filter,
  Search,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { ReviewReport, FindingSeverity, ReviewFinding } from "@/lib/types";

interface ReviewResultsProps {
  report: ReviewReport;
}

const severityOrder: FindingSeverity[] = ["high", "medium", "low", "info"];

export function ReviewResults({ report }: ReviewResultsProps) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [fileFilter, setFileFilter] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  // Track per-finding issue creation state: index -> { status, url?, error? }
  const [issueStates, setIssueStates] = useState<
    Record<number, { status: "idle" | "creating" | "created" | "error"; url?: string; error?: string }>
  >({});
  const [creatingAll, setCreatingAll] = useState(false);
  const [createAllDone, setCreateAllDone] = useState(false);

  // Severity counts
  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0, info: 0 };
    for (const f of report.findings) {
      c[f.severity]++;
    }
    return c;
  }, [report.findings]);

  // Filtered and sorted findings
  const filteredFindings = useMemo(() => {
    return [...report.findings]
      .map((f, i) => ({ ...f, _idx: i }))
      .filter((f) => !dismissedIds.has(f._idx))
      .filter((f) => severityFilter === "all" || f.severity === severityFilter)
      .filter(
        (f) =>
          !fileFilter ||
          (f.file && f.file.toLowerCase().includes(fileFilter.toLowerCase()))
      )
      .sort(
        (a, b) =>
          severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
      );
  }, [report.findings, severityFilter, fileFilter, dismissedIds]);

  const handleDismiss = (finding: ReviewFinding & { _idx?: number }) => {
    if (finding._idx !== undefined) {
      setDismissedIds((prev) => new Set([...prev, finding._idx!]));
    }
  };

  const createIssueForFinding = async (finding: ReviewFinding, idx: number): Promise<boolean> => {
    setIssueStates((prev) => ({ ...prev, [idx]: { status: "creating" } }));
    try {
      const res = await fetch("/api/reviews/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: report.repo, finding }),
      });
      const data = await res.json();
      if (res.ok) {
        setIssueStates((prev) => ({ ...prev, [idx]: { status: "created", url: data.issueUrl } }));
        return true;
      } else {
        setIssueStates((prev) => ({ ...prev, [idx]: { status: "error", error: data.error } }));
        return false;
      }
    } catch (err) {
      setIssueStates((prev) => ({
        ...prev,
        [idx]: { status: "error", error: err instanceof Error ? err.message : "Network error" },
      }));
      return false;
    }
  };

  const handleCreateIssue = async (finding: ReviewFinding & { _idx?: number }) => {
    const idx = finding._idx ?? report.findings.indexOf(finding);
    if (idx < 0) return;
    await createIssueForFinding(finding, idx);
  };

  const handleCreateAllIssues = async () => {
    setCreatingAll(true);
    setCreateAllDone(false);
    for (const finding of filteredFindings) {
      const state = issueStates[finding._idx];
      if (state?.status === "created") continue; // Skip already created
      await createIssueForFinding(finding, finding._idx);
    }
    setCreatingAll(false);
    setCreateAllDone(true);
  };

  const handleApplyFix = async (finding: ReviewFinding) => {
    try {
      const res = await fetch("/api/reviews/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: report.repo, finding }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to apply fix:", data.error);
      }
    } catch (err) {
      console.error("Error applying fix:", err);
    }
  };

  const createdCount = Object.values(issueStates).filter((s) => s.status === "created").length;

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-red-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{counts.high}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{counts.medium}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {counts.low + counts.info}
                </p>
                <p className="text-xs text-muted-foreground">Info</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {report.overallScore.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Score / 10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Type + Category Scores */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <CardTitle className="text-base">
              Review Results for {report.repo}
            </CardTitle>
            {report.reviewTypes && report.reviewTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {report.reviewTypes.map((t) => (
                  <Badge key={t} variant="secondary" className="capitalize text-xs">
                    {t} Review
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        {report.categoryScores.length > 0 && (
          <CardContent className="space-y-3">
            {report.categoryScores.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{cat.category}</span>
                  <span className="text-muted-foreground">
                    {cat.score}/{cat.maxScore} ({cat.issueCount} issue
                    {cat.issueCount !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(cat.score / cat.maxScore) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Filter Controls + Create All Issues */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter:</span>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="high">Critical</SelectItem>
            <SelectItem value="medium">Warning</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            placeholder="Filter by file path..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        {dismissedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setDismissedIds(new Set())}
          >
            Show {dismissedIds.size} dismissed
          </Button>
        )}
      </div>

      {/* Findings */}
      {filteredFindings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Findings ({filteredFindings.length})
            </h3>
            <div className="flex items-center gap-2">
              {createdCount > 0 && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {createdCount} issue{createdCount !== 1 ? "s" : ""} created
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCreateAllIssues}
                disabled={creatingAll || createAllDone}
              >
                {creatingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Issues...
                  </>
                ) : createAllDone ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    All Issues Created
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Create All Issues
                  </>
                )}
              </Button>
            </div>
          </div>
          {filteredFindings.map((finding) => {
            const state = issueStates[finding._idx];
            return (
              <div key={finding._idx} className="relative">
                <FindingCard
                  finding={finding}
                  onCreateIssue={
                    state?.status === "created" ? undefined : handleCreateIssue
                  }
                  onApplyFix={handleApplyFix}
                  onDismiss={handleDismiss}
                />
                {/* Issue creation status overlay */}
                {state?.status === "creating" && (
                  <div className="absolute bottom-3 left-6 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Creating issue...
                  </div>
                )}
                {state?.status === "created" && state.url && (
                  <div className="absolute bottom-3 left-6 flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <a href={state.url} target="_blank" rel="noopener noreferrer" className="underline">
                      Issue created
                    </a>
                  </div>
                )}
                {state?.status === "error" && (
                  <div className="absolute bottom-3 left-6 text-xs text-rose-400">
                    Failed: {state.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredFindings.length === 0 && report.findings.length > 0 && (
        <p className="text-sm text-muted-foreground">
          No findings match the current filters.
        </p>
      )}

      {report.findings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No findings reported. The code looks clean!
        </p>
      )}
    </div>
  );
}
