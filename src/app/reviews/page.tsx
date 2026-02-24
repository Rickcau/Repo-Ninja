"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewResults } from "@/components/reviews/review-results";
import { AuditResults } from "@/components/reviews/audit-results";
import type { ReviewReport, AuditReport, ReviewType, ReviewScope } from "@/lib/types";

function ReviewsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "audit" ? "audit" : "review";

  // Code Review state
  const [reviewReport, setReviewReport] = useState<ReviewReport | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Audit state
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditRepo, setAuditRepo] = useState("");

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
    try {
      const res = await fetch("/api/reviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setReviewError(json.error || "Review failed");
        return;
      }
      setReviewReport(json);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Network error");
    } finally {
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
        return;
      }
      setAuditReport(json);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Code Reviews</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="review">Code Review</TabsTrigger>
          <TabsTrigger value="audit">Best Practices Audit</TabsTrigger>
        </TabsList>

        {/* Code Review Tab */}
        <TabsContent value="review" className="mt-4 space-y-6">
          <ReviewForm onSubmit={handleReview} isLoading={isReviewing} />

          {reviewError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {reviewError}
            </div>
          )}

          {reviewReport && <ReviewResults report={reviewReport} />}
        </TabsContent>

        {/* Best Practices Audit Tab */}
        <TabsContent value="audit" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Best Practices Audit</CardTitle>
              <CardDescription>
                Audit a repository against best practices standards from the knowledge base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Repository (owner/repo)</label>
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
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {auditError}
            </div>
          )}

          {auditReport && <AuditResults report={auditReport} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
      <ReviewsContent />
    </Suspense>
  );
}
