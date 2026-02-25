"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ShieldCheck,
  Zap,
  Accessibility,
  Code2,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";
import type { ReviewType, ReviewScope } from "@/lib/types";

interface ReviewFormProps {
  onSubmit: (data: {
    repo: string;
    reviewTypes: ReviewType[];
    scope: ReviewScope;
    prNumber?: number;
    filePattern?: string;
  }) => void;
  isLoading: boolean;
}

// TODO: Replace with real API data from knowledge base
const REVIEW_TYPES: {
  value: ReviewType;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
  kbDocuments: string[];
}[] = [
  {
    value: "security",
    label: "Security",
    description:
      "Checks for vulnerabilities, dependency issues, and authentication flaws",
    icon: ShieldCheck,
    kbDocuments: ["security.md", "auth-patterns.md", "dependency-audit.md"],
  },
  {
    value: "performance",
    label: "Performance",
    description:
      "Analyzes bottlenecks, memory leaks, and optimization opportunities",
    icon: Zap,
    kbDocuments: ["performance.md", "caching-strategies.md"],
  },
  {
    value: "accessibility",
    label: "Accessibility",
    description:
      "Validates WCAG compliance, ARIA usage, and keyboard navigation",
    icon: Accessibility,
    kbDocuments: ["accessibility.md", "wcag-checklist.md"],
  },
  {
    value: "general",
    label: "General",
    description:
      "Code style, naming conventions, architecture, and maintainability",
    icon: Code2,
    kbDocuments: ["best-practices.md", "code-style.md", "architecture.md"],
  },
];

const SCOPES: { value: ReviewScope; label: string; description: string }[] = [
  {
    value: "full-repo",
    label: "Full Repository",
    description: "Review the entire repository",
  },
  {
    value: "pr",
    label: "Pull Request",
    description: "Review a specific PR",
  },
  {
    value: "files",
    label: "File Pattern",
    description: "Review files matching a pattern",
  },
];

const REPO_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export function ReviewForm({ onSubmit, isLoading }: ReviewFormProps) {
  const [repo, setRepo] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ReviewType[]>(["general"]);
  const [scope, setScope] = useState<ReviewScope>("full-repo");
  const [prNumber, setPrNumber] = useState("");
  const [filePattern, setFilePattern] = useState("");

  const repoValid = useMemo(() => REPO_PATTERN.test(repo.trim()), [repo]);
  const repoTouched = repo.length > 0;

  const toggleType = (type: ReviewType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Collect all KB documents that will be consulted
  const activeKbDocs = useMemo(() => {
    const docs = new Set<string>();
    for (const t of REVIEW_TYPES) {
      if (selectedTypes.includes(t.value)) {
        for (const d of t.kbDocuments) docs.add(d);
      }
    }
    return Array.from(docs);
  }, [selectedTypes]);

  const handleSubmit = () => {
    if (!repo.trim() || !repoValid || selectedTypes.length === 0) return;
    onSubmit({
      repo: repo.trim(),
      reviewTypes: selectedTypes,
      scope,
      prNumber:
        scope === "pr" && prNumber ? parseInt(prNumber, 10) : undefined,
      filePattern:
        scope === "files" && filePattern ? filePattern.trim() : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Code Review</CardTitle>
        <CardDescription>
          Select a repository and review options to analyze code quality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository with validation */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Repository</label>
          <div className="relative">
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              className={
                repoTouched
                  ? repoValid
                    ? "pr-9 border-green-500/50 focus-visible:ring-green-500/30"
                    : "pr-9 border-red-500/50 focus-visible:ring-red-500/30"
                  : ""
              }
            />
            {repoTouched && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {repoValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          {repoTouched && !repoValid && (
            <p className="text-xs text-red-500">
              Enter a valid repository in owner/repo format
            </p>
          )}
        </div>

        {/* Review Types as cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Review Types</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REVIEW_TYPES.map(
              ({ value, label, description, icon: Icon, kbDocuments }) => {
                const selected = selectedTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleType(value)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px] shadow-primary/20"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`h-8 w-8 rounded-md flex items-center justify-center ${
                          selected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                      {selected && (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                    {/* KB documents that will be consulted */}
                    {selected && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {kbDocuments.map((doc) => (
                          <Badge
                            key={doc}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            <BookOpen className="h-2.5 w-2.5 mr-0.5" />
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Active KB documents summary */}
        {activeKbDocs.length > 0 && (
          <div className="rounded-md bg-muted/50 border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Knowledge base documents to consult:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeKbDocs.map((doc) => (
                <Badge
                  key={doc}
                  variant="outline"
                  className="text-xs"
                >
                  {doc}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Scope */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Scope</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SCOPES.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  scope === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* PR Number (conditional) */}
        {scope === "pr" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">PR Number</label>
            <Input
              type="number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>
        )}

        {/* File Pattern (conditional) */}
        {scope === "files" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">File Pattern</label>
            <Input
              value={filePattern}
              onChange={(e) => setFilePattern(e.target.value)}
              placeholder="e.g. src/**/*.ts"
            />
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={
            !repo.trim() || !repoValid || selectedTypes.length === 0 || isLoading
          }
          className="w-full"
        >
          {isLoading ? "Reviewing..." : "Start Review"}
        </Button>
      </CardContent>
    </Card>
  );
}
