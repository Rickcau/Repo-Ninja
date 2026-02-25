"use client";

import { Suspense, useState, useCallback } from "react";
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

// TODO: Replace with real API data
const MOCK_REVIEW_REPORT: ReviewReport = {
  id: "rev-mock-001",
  repo: "acme/web-app",
  reviewTypes: ["security", "general"],
  overallScore: 7.2,
  categoryScores: [
    { category: "security", score: 6, maxScore: 10, issueCount: 3 },
    { category: "general", score: 8, maxScore: 10, issueCount: 2 },
  ],
  findings: [
    {
      severity: "high",
      category: "security",
      title: "SQL Injection in user query",
      description:
        "User input is concatenated directly into SQL query string without parameterization.",
      file: "src/api/users.ts",
      line: 42,
      codeSnippet: `const query = \`SELECT * FROM users WHERE id = '\${req.params.id}'\`;`,
      knowledgeSource: "security.md > SQL Injection Prevention",
      suggestion:
        "Use parameterized queries to prevent SQL injection attacks.",
      suggestedCode: `const query = "SELECT * FROM users WHERE id = $1";\nconst result = await db.query(query, [req.params.id]);`,
    },
    {
      severity: "high",
      category: "security",
      title: "Missing authentication middleware",
      description:
        "The /api/admin routes do not have authentication middleware applied, allowing unauthenticated access.",
      file: "src/api/admin/index.ts",
      line: 8,
      codeSnippet: `router.get("/admin/users", listUsers);`,
      knowledgeSource: "auth-patterns.md > Route Protection",
      suggestion: "Add authentication middleware to all admin routes.",
      suggestedCode: `router.get("/admin/users", requireAuth, requireAdmin, listUsers);`,
    },
    {
      severity: "medium",
      category: "security",
      title: "Sensitive data in error response",
      description:
        "Stack traces and internal error details are exposed to clients in production error responses.",
      file: "src/middleware/error-handler.ts",
      line: 15,
      codeSnippet: `res.status(500).json({ error: err.message, stack: err.stack });`,
      knowledgeSource: "security.md > Error Handling",
      suggestion:
        "Return generic error messages in production. Log full details server-side only.",
    },
    {
      severity: "medium",
      category: "general",
      title: "Unused imports in component",
      description:
        "Several imports are declared but never used, increasing bundle size.",
      file: "src/components/Dashboard.tsx",
      line: 1,
      codeSnippet: `import { useState, useEffect, useCallback, useMemo } from "react";`,
      knowledgeSource: "best-practices.md > Clean Imports",
      suggestion: "Remove unused imports: useCallback and useMemo.",
      suggestedCode: `import { useState, useEffect } from "react";`,
    },
    {
      severity: "low",
      category: "general",
      title: "Magic number in timeout",
      description:
        "A hardcoded timeout value of 30000ms is used without explanation.",
      file: "src/services/api-client.ts",
      line: 23,
      codeSnippet: `const timeout = 30000;`,
      knowledgeSource: "best-practices.md > Constants",
      suggestion: "Extract magic numbers into named constants.",
      suggestedCode: `const API_TIMEOUT_MS = 30_000;\nconst timeout = API_TIMEOUT_MS;`,
    },
    {
      severity: "info",
      category: "general",
      title: "Consider adding JSDoc comments",
      description:
        "Public API functions lack JSDoc documentation, making the API harder to understand.",
      file: "src/lib/utils.ts",
      line: 10,
      knowledgeSource: "code-style.md > Documentation",
      suggestion: "Add JSDoc comments to exported functions.",
    },
    {
      severity: "medium",
      category: "security",
      title: "JWT token stored in localStorage",
      description:
        "Authentication tokens stored in localStorage are vulnerable to XSS attacks.",
      file: "src/lib/auth.ts",
      line: 55,
      codeSnippet: `localStorage.setItem("token", jwt);`,
      knowledgeSource: "auth-patterns.md > Token Storage",
      suggestion:
        "Use httpOnly cookies for token storage instead of localStorage.",
    },
  ],
  createdAt: new Date().toISOString(),
};

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
    setReviewSubView("loading");
    setReviewProgress([]);

    // Simulate progress steps
    // TODO: Replace with real API data / streaming progress
    const steps = [
      "Connecting to repository...",
      "Fetching file tree...",
      `Querying knowledge base for ${data.reviewTypes.join(", ")} patterns...`,
      "Analyzing code against best practices...",
      "Generating findings report...",
    ];

    try {
      // Simulate progressive loading
      for (let i = 0; i < steps.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setReviewProgress((prev) => [...prev, steps[i]]);
      }

      // Try the real API first
      try {
        const res = await fetch("/api/reviews/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (res.ok) {
          setReviewReport(json);
          setReviewSubView("results");
          return;
        }
      } catch {
        // API not available, fall through to mock data
      }

      // Use mock data for demo
      // TODO: Replace with real API data
      const mockReport: ReviewReport = {
        ...MOCK_REVIEW_REPORT,
        repo: data.repo,
        reviewTypes: data.reviewTypes,
        findings: MOCK_REVIEW_REPORT.findings.filter((f) =>
          data.reviewTypes.includes(f.category)
        ),
      };

      // Recalculate score based on filtered findings
      const highCount = mockReport.findings.filter(
        (f) => f.severity === "high"
      ).length;
      const medCount = mockReport.findings.filter(
        (f) => f.severity === "medium"
      ).length;
      mockReport.overallScore = Math.max(
        1,
        10 - highCount * 1.5 - medCount * 0.5
      );

      mockReport.categoryScores = data.reviewTypes.map((type) => {
        const typeFindings = mockReport.findings.filter(
          (f) => f.category === type
        );
        return {
          category: type,
          score: Math.max(
            2,
            10 -
              typeFindings.filter((f) => f.severity === "high").length * 2 -
              typeFindings.filter((f) => f.severity === "medium").length
          ),
          maxScore: 10,
          issueCount: typeFindings.length,
        };
      });

      setReviewReport(mockReport);
      setReviewSubView("results");
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Review failed"
      );
      setReviewSubView("form");
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

  const handleHistorySelect = useCallback(
    (entry: ReviewHistoryEntry) => {
      // TODO: Replace with real API call to fetch full review report
      if (entry.status === "complete") {
        const mockReport: ReviewReport = {
          ...MOCK_REVIEW_REPORT,
          id: entry.id,
          repo: entry.repo,
          overallScore: entry.score,
        };
        setReviewReport(mockReport);
        setReviewSubView("results");
        setActiveTab("review");
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
