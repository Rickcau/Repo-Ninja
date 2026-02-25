"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Bug,
  Copy,
  ExternalLink,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import type { ReviewFinding, FindingSeverity } from "@/lib/types";

const severityConfig: Record<
  FindingSeverity,
  { color: string; label: string; icon: typeof AlertTriangle }
> = {
  high: { color: "bg-red-600 text-white", label: "Critical", icon: ShieldAlert },
  medium: { color: "bg-amber-500 text-black", label: "Warning", icon: AlertTriangle },
  low: { color: "bg-indigo-500 text-white", label: "Low", icon: Bug },
  info: { color: "bg-muted text-muted-foreground", label: "Info", icon: Info },
};

interface FindingCardProps {
  finding: ReviewFinding;
  onCreateIssue?: (finding: ReviewFinding) => void;
  onApplyFix?: (finding: ReviewFinding) => void;
  onDismiss?: (finding: ReviewFinding) => void;
}

export function FindingCard({
  finding,
  onCreateIssue,
  onApplyFix,
  onDismiss,
}: FindingCardProps) {
  const severity = severityConfig[finding.severity] ?? severityConfig.info;
  const Icon = severity.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={severity.color}>
              <Icon className="h-3 w-3 mr-1" />
              {severity.label}
            </Badge>
            <Badge variant="outline">{finding.category}</Badge>
            <CardTitle className="text-base">{finding.title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onDismiss(finding)}
              aria-label="Dismiss finding"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{finding.description}</p>

        {/* File location */}
        {(finding.file || finding.line) && (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
            <span className="truncate">
              {finding.file}
              {finding.line ? `:${finding.line}` : ""}
            </span>
          </div>
        )}

        {/* Code snippet */}
        {finding.codeSnippet && (
          <div className="relative group">
            <pre className="rounded-md bg-muted/70 border border-border p-3 text-xs font-mono overflow-x-auto">
              <code>{finding.codeSnippet}</code>
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => navigator.clipboard.writeText(finding.codeSnippet || "")}
              aria-label="Copy code"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Knowledge base citation */}
        {finding.knowledgeSource && (
          <p className="text-xs text-muted-foreground italic">
            Grounded in: {finding.knowledgeSource}
          </p>
        )}

        {/* Suggestion */}
        {finding.suggestion && (
          <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs font-medium mb-1 text-primary">Suggested Fix:</p>
            <p className="text-sm">{finding.suggestion}</p>
            {finding.suggestedCode && (
              <pre className="mt-2 rounded-md bg-muted/70 border border-border p-2 text-xs font-mono overflow-x-auto">
                <code>{finding.suggestedCode}</code>
              </pre>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          {onCreateIssue && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onCreateIssue(finding)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Create Issue
            </Button>
          )}
          {onApplyFix && finding.suggestedCode && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onApplyFix(finding)}
            >
              Apply Fix
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
