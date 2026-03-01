"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  ShieldCheck, Zap, Accessibility, Code2, CheckCircle2, BookOpen,
} from "lucide-react";
import { useRepoContext } from "@/lib/repo-context";
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

const ICON_MAP: Record<string, typeof ShieldCheck> = {
  security: ShieldCheck,
  performance: Zap,
  accessibility: Accessibility,
  general: Code2,
};

interface ReviewTypeEntry {
  id: string;
  label: string;
  description: string;
  kbDocuments: string[];
}

const FALLBACK_TYPES: ReviewTypeEntry[] = [
  { id: "security", label: "Security", description: "Checks for vulnerabilities, dependency issues, and authentication flaws", kbDocuments: [] },
  { id: "performance", label: "Performance", description: "Analyzes bottlenecks, memory leaks, and optimization opportunities", kbDocuments: [] },
  { id: "accessibility", label: "Accessibility", description: "Validates WCAG compliance, ARIA usage, and keyboard navigation", kbDocuments: [] },
  { id: "general", label: "General", description: "Code style, naming conventions, architecture, and maintainability", kbDocuments: [] },
];

const SCOPES: { value: ReviewScope; label: string; description: string }[] = [
  { value: "full-repo", label: "Full Repository", description: "Review the entire repository" },
  { value: "pr", label: "Pull Request", description: "Review a specific PR" },
  { value: "files", label: "File Pattern", description: "Review files matching a pattern" },
];

export function ReviewForm({ onSubmit, isLoading }: ReviewFormProps) {
  const { selectedRepo: globalRepo } = useRepoContext();
  const repo = globalRepo?.fullName ?? "";
  const [selectedTypes, setSelectedTypes] = useState<ReviewType[]>(["general"]);
  const [scope, setScope] = useState<ReviewScope>("full-repo");
  const [prNumber, setPrNumber] = useState("");
  const [filePattern, setFilePattern] = useState("");
  const [reviewTypes, setReviewTypes] = useState<ReviewTypeEntry[]>(FALLBACK_TYPES);

  useEffect(() => {
    fetch("/api/reviews/types")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.types?.length > 0) setReviewTypes(data.types);
      })
      .catch(() => {});
  }, []);

  const repoValid = repo.includes("/");

  const toggleType = (type: ReviewType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const activeKbDocs = useMemo(() => {
    const docs = new Set<string>();
    for (const t of reviewTypes) {
      if (selectedTypes.includes(t.id as ReviewType)) {
        for (const d of t.kbDocuments) docs.add(d);
      }
    }
    return Array.from(docs);
  }, [selectedTypes, reviewTypes]);

  const handleSubmit = () => {
    if (!repo.trim() || !repoValid || selectedTypes.length === 0) return;
    onSubmit({
      repo: repo.trim(),
      reviewTypes: selectedTypes,
      scope,
      prNumber: scope === "pr" && prNumber ? parseInt(prNumber, 10) : undefined,
      filePattern: scope === "files" && filePattern ? filePattern.trim() : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Code Review</CardTitle>
        <CardDescription>Select a repository and review options to analyze code quality.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Repository</label>
          <Input
            value={repo}
            readOnly
            placeholder="Select a repository from the header"
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Review Types</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reviewTypes.map(({ id, label, description, kbDocuments }) => {
              const selected = selectedTypes.includes(id as ReviewType);
              const Icon = ICON_MAP[id] || Code2;
              return (
                <button key={id} type="button" onClick={() => toggleType(id as ReviewType)}
                  className={`rounded-lg border p-4 text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-[0_0_0_1px] shadow-primary/20" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                    {selected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  {selected && kbDocuments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {kbDocuments.map((doc) => (
                        <Badge key={doc} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          <BookOpen className="h-2.5 w-2.5 mr-0.5" />{doc}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeKbDocs.length > 0 && (
          <div className="rounded-md bg-muted/50 border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Knowledge base documents to consult:</p>
            <div className="flex flex-wrap gap-1.5">
              {activeKbDocs.map((doc) => <Badge key={doc} variant="outline" className="text-xs">{doc}</Badge>)}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Scope</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SCOPES.map(({ value, label, description }) => (
              <button key={value} type="button" onClick={() => setScope(value)}
                className={`rounded-lg border p-3 text-left transition-colors ${scope === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {scope === "pr" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">PR Number</label>
            <Input type="number" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} placeholder="e.g. 42" />
          </div>
        )}

        {scope === "files" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">File Pattern</label>
            <Input value={filePattern} onChange={(e) => setFilePattern(e.target.value)} placeholder="e.g. src/**/*.ts" />
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!repo.trim() || !repoValid || selectedTypes.length === 0 || isLoading} className="w-full">
          {isLoading ? "Reviewing..." : "Start Review"}
        </Button>
      </CardContent>
    </Card>
  );
}
