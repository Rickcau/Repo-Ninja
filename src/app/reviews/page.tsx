"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewResults } from "@/components/reviews/review-results";
import { AuditResults } from "@/components/reviews/audit-results";
import { ReviewHistory } from "@/components/reviews/review-history";
import type { ReviewHistoryEntry } from "@/components/reviews/review-history";
import { Loader2 } from "lucide-react";
import type { ReviewReport, AuditReport, ReviewType, ReviewScope } from "@/lib/types";

const POLL_INTERVAL = 3000;

function ReviewsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "audit" ? "audit" : "review";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [reviewSubView, setReviewSubView] = useState<
    "form" | "loading" | "results"
  >("form");

  // Code Review state
  const [reviewReport, setReviewReport] = useState<ReviewReport | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewProgress, setReviewProgress] = useState<string[]>([]);
  const reviewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audit state
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditRepo, setAuditRepo] = useState("");
  const auditPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (reviewPollRef.current) clearInterval(reviewPollRef.current);
      if (auditPollRef.current) clearInterval(auditPollRef.current);
    };
  }, []);

  const pollReport = useCallback(
    (reportId: string, type: "review" | "audit") => {
      const pollFn = async () => {
        try {
          const res = await fetch(`/api/reviews/${reportId}`);
          if (!res.ok) return;
          const report = await res.json();

          if (report.status === "completed" || report.status === "failed") {
            if (type === "review" && reviewPollRef.current) {
              clearInterval(reviewPollRef.current);
              reviewPollRef.current = null;
            }
            if (type === "audit" && auditPollRef.current) {
              clearInterval(auditPollRef.current);
              auditPollRef.current = null;
            }

            if (report.status === "failed") {
              if (type === "review") {
                setReviewError("Review failed. Please try again.");
                setReviewSubView("form");
                setIsReviewing(false);
              } else {
                setAuditError("Audit failed. Please try again.");
                setIsAuditing(false);
              }
              return;
            }

            if (type === "review") {
              setReviewReport(report);
              setReviewSubView("results");
              setIsReviewing(false);
            } else {
              setAuditReport(report);
              setIsAuditing(false);
            }
          }
        } catch {
          // Network error during polling — keep retrying
        }
      };

      pollFn();
      const ref = setInterval(pollFn, POLL_INTERVAL);
      if (type === "review") {
        reviewPollRef.current = ref;
      } else {
        auditPollRef.current = ref;
      }
    },
    []
  );

  const handleReview = async (data: {
    repo: string;
    reviewTypes: ReviewType[];
    scope: ReviewScope;
    prNumber?: number;
    filePattern?: string;
  }) => {
    setIsReviewing(true);
    setReviewError(null);
    setReviewReport(null);
    setReviewSubView("loading");
    setReviewProgress([]);

    const steps = [
      "Connecting to repository...",
      "Fetching file tree...",
      `Querying knowledge base for ${data.reviewTypes.join(", ")} patterns...`,
      "Analyzing code against best practices...",
      "Generating findings report...",
    ];

    try {
      const progressInterval = setInterval(() => {
        setReviewProgress((prev) => {
          if (prev.length < steps.length) {
            return [...prev, steps[prev.length]];
          }
          return prev;
        });
      }, 800);

      const res = await fetch("/api/reviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      clearInterval(progressInterval);
      setReviewProgress(steps);

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "Review failed");
      }

      // API returns { id, status: "running" } (HTTP 202) — start polling
      if (json.id && json.status === "running") {
        pollReport(json.id, "review");
      } else {
        setReviewReport(json);
        setReviewSubView("results");
        setIsReviewing(false);
      }
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Review failed"
      );
      setReviewSubView("form");
      setIsReviewing(false);
    }
  };

  const handleAudit = async () => {
    if (!auditRepo.trim()) return;
    setIsAuditing(true);
    setAuditError(null);
    setAuditReport(null);
    try {
      const res = await fetch("/api/reviews/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: auditRepo.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuditError(json.error || "Audit failed");
        setIsAuditing(false);
        return;
      }

      // API returns { id, status: "running" } (HTTP 202) — start polling
      if (json.id && json.status === "running") {
        pollReport(json.id, "audit");
      } else {
        setAuditReport(json);
        setIsAuditing(false);
      }
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Network error");
      setIsAuditing(false);
    }
  };

  const handleHistorySelect = useCallback(
    async (entry: ReviewHistoryEntry) => {
      if (entry.status !== "complete") return;

      // Fetch the full report from the API
      const reportType = entry.reportType || "review";
      const endpoint =
        reportType === "audit"
          ? `/api/reviews/${entry.id}?type=audit`
          : `/api/reviews/${entry.id}`;

      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const report = await res.json();

        if (reportType === "audit") {
          setAuditReport(report);
          setActiveTab("audit");
        } else {
          setReviewReport(report);
          setReviewSubView("results");
          setActiveTab("review");
        }
      } catch {
        // If individual report fetch fails, just navigate to the tab
        setActiveTab(reportType === "audit" ? "audit" : "review");
      }
    },
    []
  );

  const handleBackToForm = () => {
    setReviewSubView("form");
    setReviewReport(null);
    setReviewError(null);
    setReviewProgress([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Code Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run AI-powered code reviews and best practices audits.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="review">Code Review</TabsTrigger>
          <TabsTrigger value="audit">Best Practices Audit</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Code Review Tab */}
        <TabsContent value="review" className="mt-4 space-y-6">
          {reviewSubView === "form" && (
            <>
              <ReviewForm onSubmit={handleReview} isLoading={isReviewing} />

              {reviewError && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                  {reviewError}
                </div>
              )}
            </>
          )}

          {reviewSubView === "loading" && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Analyzing repository...</p>
                  <div className="w-full max-w-md space-y-2">
                    {reviewProgress.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reviewSubView === "results" && reviewReport && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToForm}
                >
                  New Review
                </Button>
              </div>
              <ReviewResults report={reviewReport} />
            </>
          )}
        </TabsContent>

        {/* Best Practices Audit Tab */}
        <TabsContent value="audit" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Best Practices Audit</CardTitle>
              <CardDescription>
                Audit a repository against best practices standards from the
                knowledge base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Repository (owner/repo)
                </label>
                <Input
                  value={auditRepo}
                  onChange={(e) => setAuditRepo(e.target.value)}
                  placeholder="owner/repo"
                />
              </div>
              <Button
                onClick={handleAudit}
                disabled={!auditRepo.trim() || isAuditing}
                className="w-full"
              >
                {isAuditing ? "Auditing..." : "Start Audit"}
              </Button>
            </CardContent>
          </Card>

          {auditError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
              {auditError}
            </div>
          )}

          {auditReport && <AuditResults report={auditReport} />}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <ReviewHistory onSelectReview={handleHistorySelect} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Loading...</div>
      }
    >
      <ReviewsContent />
    </Suspense>
  );
}
