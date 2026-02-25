"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// TODO: Replace with real completion detection from API
const steps = [
  {
    id: "connect-github",
    label: "Connect GitHub",
    description: "Link your GitHub account to access repositories",
    icon: Github,
    completed: true,
    href: "/settings",
    actionLabel: "Connected",
  },
  {
    id: "setup-kb",
    label: "Set Up Knowledge Base",
    description: "Configure ChromaDB to store your team's best practices",
    icon: BookOpen,
    completed: false,
    href: "/knowledge",
    actionLabel: "Set Up",
  },
  {
    id: "index-docs",
    label: "Index Documents",
    description: "Upload and index your coding standards and guidelines",
    icon: Database,
    completed: false,
    href: "/knowledge",
    actionLabel: "Index",
  },
  {
    id: "first-review",
    label: "Run First Review",
    description: "Let an AI agent review one of your repositories",
    icon: FileSearch,
    completed: false,
    href: "/reviews",
    actionLabel: "Start Review",
  },
  {
    id: "scaffold-repo",
    label: "Scaffold a Repo",
    description: "Generate a new repository with best practices baked in",
    icon: Hammer,
    completed: false,
    href: "/scaffold",
    actionLabel: "Scaffold",
  },
  {
    id: "deploy-agent",
    label: "Deploy First Agent",
    description: "Launch an autonomous agent to handle a GitHub issue",
    icon: Bot,
    completed: false,
    href: "/agents",
    actionLabel: "Deploy",
  },
];

export function OnboardingChecklist({ userName }: OnboardingChecklistProps) {
  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Welcome, {userName}!
        </CardTitle>
        <CardDescription>
          Complete these steps to get the most out of Repo-Ninja. {completedCount}/{steps.length} done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border border-border p-3 transition-colors ${
                step.completed ? "bg-muted/50" : ""
              }`}
            >
              <div className="shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StepIcon className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={`text-sm font-medium ${
                      step.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  {step.description}
                </p>
              </div>
              <Link href={step.href}>
                <Button
                  variant={step.completed ? "ghost" : "outline"}
                  size="sm"
                  disabled={step.completed}
                >
                  {step.actionLabel}
                </Button>
              </Link>
            </div>
          );
        })}

        {/* Pro tip */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/[0.08] border border-primary/20 p-3">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pro tip:</span>{" "}
            Start by indexing your team&apos;s coding standards into the Knowledge Base.
            This grounds all agent actions in your specific best practices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
