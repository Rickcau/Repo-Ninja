"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewFinding, FindingSeverity } from "@/lib/types";

const severityConfig: Record<FindingSeverity, { color: string; label: string }> = {
  high: { color: "bg-red-600 text-white", label: "High" },
  medium: { color: "bg-yellow-500 text-black", label: "Medium" },
  low: { color: "bg-blue-500 text-white", label: "Low" },
  info: { color: "bg-gray-400 text-white", label: "Info" },
};

interface FindingCardProps {
  finding: ReviewFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const severity = severityConfig[finding.severity] ?? severityConfig.info;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge className={severity.color}>{severity.label}</Badge>
          <Badge variant="outline">{finding.category}</Badge>
          <CardTitle className="text-base">{finding.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{finding.description}</p>

        {(finding.file || finding.line) && (
          <p className="text-xs font-mono text-muted-foreground">
            {finding.file}
            {finding.line ? `:${finding.line}` : ""}
          </p>
        )}

        {finding.suggestion && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs font-medium mb-1">Suggestion:</p>
            <p className="text-sm">{finding.suggestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
