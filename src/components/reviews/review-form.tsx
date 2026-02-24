"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const REVIEW_TYPES: { value: ReviewType; label: string }[] = [
  { value: "security", label: "Security" },
  { value: "performance", label: "Performance" },
  { value: "accessibility", label: "Accessibility" },
  { value: "general", label: "General" },
];

const SCOPES: { value: ReviewScope; label: string; description: string }[] = [
  { value: "full-repo", label: "Full Repository", description: "Review the entire repository" },
  { value: "pr", label: "Pull Request", description: "Review a specific PR" },
  { value: "files", label: "File Pattern", description: "Review files matching a pattern" },
];

export function ReviewForm({ onSubmit, isLoading }: ReviewFormProps) {
  const [repo, setRepo] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ReviewType[]>(["general"]);
  const [scope, setScope] = useState<ReviewScope>("full-repo");
  const [prNumber, setPrNumber] = useState("");
  const [filePattern, setFilePattern] = useState("");

  const toggleType = (type: ReviewType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = () => {
    if (!repo.trim() || selectedTypes.length === 0) return;
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
        <CardDescription>
          Select a repository and review options to analyze code quality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Repository (owner/repo)</label>
          <Input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
          />
        </div>

        {/* Review Types */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Review Types</label>
          <div className="flex flex-wrap gap-4">
            {REVIEW_TYPES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedTypes.includes(value)}
                  onCheckedChange={() => toggleType(value)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

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
          disabled={!repo.trim() || selectedTypes.length === 0 || isLoading}
          className="w-full"
        >
          {isLoading ? "Reviewing..." : "Start Review"}
        </Button>
      </CardContent>
    </Card>
  );
}
