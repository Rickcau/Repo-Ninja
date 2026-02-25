"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSearch,
  ShieldCheck,
  Code,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// TODO: Replace with real API data
const mockAgentActivities = [
  {
    id: "1",
    agentType: "code-review" as const,
    taskName: "PR Security Review",
    repo: "acme/web-app",
    currentStep: 3,
    totalSteps: 5,
    stepDescription: "Analyzing dependency vulnerabilities",
    progress: 60,
    elapsedTime: "2m 34s",
    status: "in-progress" as const,
  },
  {
    id: "2",
    agentType: "best-practices-audit" as const,
    taskName: "Best Practices Audit",
    repo: "acme/api-service",
    currentStep: 5,
    totalSteps: 5,
    stepDescription: "Report generated successfully",
    progress: 100,
    elapsedTime: "4m 12s",
    status: "complete" as const,
  },
  {
    id: "3",
    agentType: "code-writer" as const,
    taskName: "Issue Fix #42",
    repo: "acme/mobile-sdk",
    currentStep: 2,
    totalSteps: 4,
    stepDescription: "Error during code generation",
    progress: 50,
    elapsedTime: "1m 08s",
    status: "failed" as const,
  },
];

const agentIcons = {
  "code-review": FileSearch,
  "best-practices-audit": ShieldCheck,
  "code-writer": Code,
  "issue-solver": Code,
};

const statusConfig = {
  "in-progress": {
    color: "bg-blue-500/[0.12] text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Clock,
    barColor: "bg-blue-500",
  },
  complete: {
    color: "bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
    barColor: "bg-emerald-500",
  },
  failed: {
    color: "bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: XCircle,
    barColor: "bg-rose-500",
  },
};

export function AgentActivityFeed() {
  const activities = mockAgentActivities;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Agent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No agent activity yet.
          </p>
        ) : (
          activities.map((activity) => {
            const AgentIcon = agentIcons[activity.agentType] || Code;
            const config = statusConfig[activity.status];
            const StatusIcon = config.icon;

            return (
              <Link
                key={activity.id}
                href="/agents"
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    <AgentIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {activity.taskName}
                      </p>
                      <Badge variant="outline" className={config.color}>
                        <StatusIcon className="h-3 w-3" />
                        {activity.status === "in-progress"
                          ? "Running"
                          : activity.status === "complete"
                          ? "Done"
                          : "Failed"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {activity.repo}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Step {activity.currentStep}/{activity.totalSteps}
                      </span>
                      <span className="text-border">|</span>
                      <span className="truncate">{activity.stepDescription}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${config.barColor}`}
                          style={{ width: `${activity.progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                        {activity.progress}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.elapsedTime}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
