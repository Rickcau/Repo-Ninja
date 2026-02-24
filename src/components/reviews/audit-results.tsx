"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <div className="space-y-6">
      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Results for {report.repo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
