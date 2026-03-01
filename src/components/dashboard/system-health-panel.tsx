"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonText } from "@/components/shared/skeleton-loader";
import {
  Database,
  Github,
  FileSearch,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface HealthData {
  chromaDb: { status: string; chunkCount: number };
  githubApi: { used: number; limit: number };
  recentReviews: Array<{
    id: string;
    repo: string;
    reviewTypes: string[];
    findings: Array<{ severity: string }>;
    createdAt: string;
  }>;
}

const reviewTypeIcons: Record<string, typeof FileSearch> = {
  security: ShieldCheck,
  performance: AlertTriangle,
  general: FileSearch,
};

export function SystemHealthPanel() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (json) setData(json); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">System Health</CardTitle></CardHeader>
        <CardContent><SkeletonText lines={4} /></CardContent>
      </Card>
    );
  }

  const health = data ?? {
    chromaDb: { status: "unknown", chunkCount: 0 },
    githubApi: { used: 0, limit: 5000 },
    recentReviews: [],
  };
  const ratePercent = health.githubApi.limit > 0
    ? Math.round((health.githubApi.used / health.githubApi.limit) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">ChromaDB</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={health.chromaDb.status === "ok" ? "bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20"}>
              <CheckCircle2 className="h-3 w-3" />
              {health.chromaDb.status === "ok" ? "OK" : "Error"}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {health.chromaDb.chunkCount.toLocaleString()} chunks
            </span>
          </div>
        </div>
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
            <div className={`h-full rounded-full transition-all ${ratePercent > 80 ? "bg-rose-500" : ratePercent > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratePercent}%` }} />
          </div>
        </div>
        <div className="border-t border-border" />
        <div>
          <h3 className="text-sm font-medium mb-3">Recent Reviews</h3>
          <div className="space-y-2">
            {health.recentReviews.length === 0 ? (
              <p className="text-xs text-muted-foreground">No reviews yet.</p>
            ) : (
              health.recentReviews.map((review) => {
                const primaryType = review.reviewTypes?.[0] || "general";
                const ReviewIcon = reviewTypeIcons[primaryType] || FileSearch;
                const criticalCount = review.findings?.filter((f) => f.severity === "high").length ?? 0;
                return (
                  <div key={review.id} className="flex items-center justify-between rounded-md border border-border p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ReviewIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono truncate">{review.repo}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize text-xs">{primaryType}</Badge>
                      {criticalCount > 0 && (
                        <Badge variant="outline" className="bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">
                          {criticalCount} critical
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
