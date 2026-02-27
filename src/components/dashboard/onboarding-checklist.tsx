"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonLoader } from "@/components/shared/skeleton-loader";
import {
  Github,
  BookOpen,
  Database,
  FileSearch,
  Hammer,
  Bot,
  CheckCircle2,
  Circle,
  Lightbulb,
} from "lucide-react";

interface OnboardingChecklistProps {
  userName: string;
}

const stepMeta: Record<string, { icon: typeof Github; href: string; actionLabel: string; description: string }> = {
  "connect-github": { icon: Github, href: "/settings", actionLabel: "Connected", description: "Link your GitHub account to access repositories" },
  "setup-kb": { icon: BookOpen, href: "/knowledge", actionLabel: "Set Up", description: "Configure ChromaDB to store your team's best practices" },
  "index-docs": { icon: Database, href: "/knowledge", actionLabel: "Index", description: "Upload and index your coding standards and guidelines" },
  "first-review": { icon: FileSearch, href: "/reviews", actionLabel: "Start Review", description: "Let an AI agent review one of your repositories" },
  "scaffold-repo": { icon: Hammer, href: "/scaffold", actionLabel: "Scaffold", description: "Generate a new repository with best practices baked in" },
  "deploy-agent": { icon: Bot, href: "/agents", actionLabel: "Deploy", description: "Launch an autonomous agent to handle a GitHub issue" },
};

export function OnboardingChecklist({ userName }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<{ id: string; label: string; complete: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.steps) setSteps(json.steps);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-xl">Welcome!</CardTitle></CardHeader>
        <CardContent><SkeletonLoader lines={6} /></CardContent>
      </Card>
    );
  }

  const completedCount = steps.filter((s) => s.complete).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome, {userName}!</CardTitle>
        <CardDescription>
          Complete these steps to get the most out of Repo-Ninja. {completedCount}/{steps.length} done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => {
          const meta = stepMeta[step.id] || { icon: Circle, href: "/", actionLabel: "Go", description: "" };
          const StepIcon = meta.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border border-border p-3 transition-colors ${step.complete ? "bg-muted/50" : ""}`}
            >
              <div className="shrink-0">
                {step.complete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StepIcon className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${step.complete ? "line-through text-muted-foreground" : ""}`}>
                    {step.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">{meta.description}</p>
              </div>
              <Link href={meta.href}>
                <Button variant={step.complete ? "ghost" : "outline"} size="sm" disabled={step.complete}>
                  {step.complete ? "Done" : meta.actionLabel}
                </Button>
              </Link>
            </div>
          );
        })}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/[0.08] border border-primary/20 p-3">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pro tip:</span>{" "}
            Start by indexing your team&apos;s coding standards into the Knowledge Base.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
