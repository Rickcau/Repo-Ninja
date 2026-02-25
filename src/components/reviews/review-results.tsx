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

  const handleCreateIssue = (finding: ReviewFinding) => {
    // TODO: Replace with real API call to create a GitHub issue
    console.log("Create issue for:", finding.title);
  };

  const handleApplyFix = (finding: ReviewFinding) => {
    // TODO: Replace with real API call to apply the fix
    console.log("Apply fix for:", finding.title);
  };

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

      {/* Category Scores */}
      {report.categoryScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Review Results for {report.repo}
            </CardTitle>
          </CardHeader>
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
        </Card>
      )}

      {/* Filter Controls */}
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
          <h3 className="text-lg font-semibold">
            Findings ({filteredFindings.length})
          </h3>
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding._idx}
              finding={finding}
              onCreateIssue={handleCreateIssue}
              onApplyFix={handleApplyFix}
              onDismiss={handleDismiss}
            />
          ))}
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
