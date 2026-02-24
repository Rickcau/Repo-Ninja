"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingCard } from "./finding-card";
import type { ReviewReport, FindingSeverity } from "@/lib/types";

interface ReviewResultsProps {
  report: ReviewReport;
}

const severityOrder: FindingSeverity[] = ["high", "medium", "low", "info"];

export function ReviewResults({ report }: ReviewResultsProps) {
  const sortedFindings = [...report.findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>Review Results for {report.repo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold tabular-nums">
              {report.overallScore.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Overall Score</p>
              <p>out of 10</p>
            </div>
          </div>

          {/* Category Scores */}
          {report.categoryScores.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Category Scores</h3>
              {report.categoryScores.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{cat.category}</span>
                    <span className="text-muted-foreground">
                      {cat.score}/{cat.maxScore} ({cat.issueCount} issue{cat.issueCount !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Findings */}
      {sortedFindings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">
            Findings ({sortedFindings.length})
          </h3>
          {sortedFindings.map((finding, i) => (
            <FindingCard key={i} finding={finding} />
          ))}
        </div>
      )}

      {sortedFindings.length === 0 && (
        <p className="text-sm text-muted-foreground">No findings reported. The code looks clean!</p>
      )}
    </div>
  );
}
