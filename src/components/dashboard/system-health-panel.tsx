"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Github,
  Clock,
  FileSearch,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// TODO: Replace with real API data
const mockHealth = {
  chromaDb: { status: "ok" as const, chunkCount: 1_247 },
  githubApi: { used: 312, limit: 5_000 },
  lastIndexed: "2026-02-25T14:32:00Z",
};

// TODO: Replace with real API data
const mockRecentReviews = [
  {
    id: "r1",
    repo: "acme/web-app",
    type: "security" as const,
    criticalCount: 2,
  },
  {
    id: "r2",
    repo: "acme/api-service",
    type: "performance" as const,
    criticalCount: 0,
  },
  {
    id: "r3",
    repo: "acme/mobile-sdk",
    type: "general" as const,
    criticalCount: 1,
  },
];

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const reviewTypeIcons: Record<string, typeof FileSearch> = {
  security: ShieldCheck,
  performance: AlertTriangle,
  general: FileSearch,
};

export function SystemHealthPanel() {
  const health = mockHealth;
  const reviews = mockRecentReviews;
  const ratePercent = Math.round((health.githubApi.used / health.githubApi.limit) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ChromaDB status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">ChromaDB</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                health.chromaDb.status === "ok"
                  ? "bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20"
              }
            >
              <CheckCircle2 className="h-3 w-3" />
              {health.chromaDb.status === "ok" ? "OK" : "Error"}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {health.chromaDb.chunkCount.toLocaleString()} chunks
            </span>
          </div>
        </div>

        {/* GitHub API rate */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">GitHub API</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {health.githubApi.used.toLocaleString()} / {health.githubApi.limit.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                ratePercent > 80 ? "bg-rose-500" : ratePercent > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${ratePercent}%` }}
            />
          </div>
        </div>

        {/* Last indexed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Last Indexed</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(health.lastIndexed)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Recent Reviews */}
        <div>
          <h3 className="text-sm font-medium mb-3">Recent Reviews</h3>
          <div className="space-y-2">
            {reviews.map((review) => {
              const ReviewIcon = reviewTypeIcons[review.type] || FileSearch;
              return (
                <div
                  key={review.id}
                  className="flex items-center justify-between rounded-md border border-border p-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ReviewIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-mono truncate">{review.repo}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize text-xs">
                      {review.type}
                    </Badge>
                    {review.criticalCount > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs"
                      >
                        {review.criticalCount} critical
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
