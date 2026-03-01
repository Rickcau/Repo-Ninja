"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { AuditReport, AuditCheck } from "@/lib/types";

interface AuditResultsProps {
  report: AuditReport;
}

const statusConfig: Record<AuditCheck["status"], { color: string; label: string }> = {
  pass: { color: "bg-green-600 text-white", label: "Pass" },
  fail: { color: "bg-red-600 text-white", label: "Fail" },
  warning: { color: "bg-yellow-500 text-black", label: "Warning" },
};

export function AuditResults({ report }: AuditResultsProps) {
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const handleCreateIssue = async () => {
    setIsCreatingIssue(true);
    setIssueError(null);
    try {
      const res = await fetch("/api/reviews/audit/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const json = await res.json();
      if (!res.ok) {
        setIssueError(json.error || "Failed to create issue");
        return;
      }
      setIssueUrl(json.issueUrl);
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsCreatingIssue(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Results for {report.repo}</CardTitle>
            {/* Create Issue Button */}
            {issueUrl ? (
              <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Issue
                </Button>
              </a>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCreateIssue}
                disabled={isCreatingIssue}
              >
                {isCreatingIssue ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Issue...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Create Issue
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {issueError && (
            <p className="text-xs text-rose-400">{issueError}</p>
          )}
          {issueUrl && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Issue created successfully
            </div>
          )}

          {/* Detected Stack */}
          {report.repoType && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">{report.repoType}</Badge>
              {report.detectedStack && (
                <>
                  <Badge variant="secondary" className="text-xs">{report.detectedStack.language}</Badge>
                  <Badge variant="secondary" className="text-xs">{report.detectedStack.framework}</Badge>
                  <Badge variant="secondary" className="text-xs">{report.detectedStack.runtime}</Badge>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold tabular-nums">
              {report.complianceScore}%
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Compliance Score</p>
              <p>
                {report.checks.filter((c) => c.status === "pass").length} of{" "}
                {report.checks.length} checks passed
              </p>
            </div>
          </div>

          {/* Compliance bar */}
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${report.complianceScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checks */}
      {report.checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {report.checks.map((check, i) => {
                const status = statusConfig[check.status] ?? statusConfig.warning;
                return (
                  <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Badge className={`mt-0.5 ${status.color}`}>{status.label}</Badge>
                    <div>
                      <p className="text-sm font-medium">{check.name}</p>
                      <p className="text-sm text-muted-foreground">{check.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-sm">{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
