"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NaturalLanguageForm } from "@/components/scaffold/natural-language-form";
import { GuidedForm } from "@/components/scaffold/guided-form";
import { ScaffoldPlanView } from "@/components/scaffold/scaffold-plan-view";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Search, Database, FileCode, Eye } from "lucide-react";
import type { ScaffoldPlan } from "@/lib/types";

const POLL_INTERVAL = 3000;

const PROGRESS_STEPS = [
  { label: "Analyzing requirements...", icon: Search, durationMs: 1200 },
  { label: "Querying knowledge base...", icon: Database, durationMs: 1500 },
  { label: "Generating file structure...", icon: FileCode, durationMs: 1800 },
  { label: "Preparing preview...", icon: Eye, durationMs: 1000 },
];

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Generating your scaffold plan...
          </h3>
          {PROGRESS_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === currentStep;
            const isComplete = i < currentStep;
            const isPending = i > currentStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : isComplete
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                  {isComplete ? (
                    <Check className="h-4 w-4 text-brand-400" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScaffoldPage() {
  const [plan, setPlan] = useState<ScaffoldPlan | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ repoUrl: string } | null>(null);
  const [progressStep, setProgressStep] = useState(-1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const planPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const createPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (planPollRef.current) clearInterval(planPollRef.current);
      if (createPollRef.current) clearInterval(createPollRef.current);
    };
  }, []);

  const animateProgress = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let step = 0;
      setProgressStep(0);

      const advance = () => {
        step++;
        if (step < PROGRESS_STEPS.length) {
          setProgressStep(step);
          setTimeout(advance, PROGRESS_STEPS[step].durationMs);
        } else {
          resolve();
        }
      };

      setTimeout(advance, PROGRESS_STEPS[0].durationMs);
    });
  }, []);

  const generatePlan = async (body: Record<string, unknown>) => {
    setIsGenerating(true);
    setPlan(null);
    setPlanError(null);
    setProgressStep(0);

    const progressPromise = animateProgress();

    try {
      const res = await fetch("/api/scaffold/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        await progressPromise;
        setPlanError(data.error || `Plan generation failed (HTTP ${res.status})`);
        setProgressStep(-1);
        setIsGenerating(false);
        return;
      }

      // API returns { planId, status: "generating" } (HTTP 202) — start polling
      if (data.planId && data.status === "generating") {
        const pollFn = async () => {
          try {
            const pollRes = await fetch(`/api/scaffold/plan?planId=${data.planId}`);
            if (!pollRes.ok) return;
            const pollData = await pollRes.json();

            if (pollData.status === "completed" || pollData.status === "failed") {
              if (planPollRef.current) {
                clearInterval(planPollRef.current);
                planPollRef.current = null;
              }

              await progressPromise;
              setProgressStep(-1);

              if (pollData.status === "completed" && pollData.plan) {
                setPlan(pollData.plan);
                setKnowledgeSources(pollData.knowledgeSources || []);
              } else {
                setPlanError(
                  pollData.error ||
                  "Plan generation failed. The AI service may be unavailable — check Settings > System Status for details."
                );
              }
              setIsGenerating(false);
            }
          } catch {
            // Keep retrying on network errors
          }
        };

        pollFn();
        planPollRef.current = setInterval(pollFn, POLL_INTERVAL);
      } else if (data.plan) {
        // Synchronous response fallback
        await progressPromise;
        setPlan(data.plan);
        setKnowledgeSources(data.knowledgeSources || []);
        setProgressStep(-1);
        setIsGenerating(false);
      } else {
        await progressPromise;
        setPlanError("No plan was generated. Please try again.");
        setProgressStep(-1);
        setIsGenerating(false);
      }
    } catch (err) {
      await progressPromise;
      setPlanError(err instanceof Error ? err.message : "Network error — please try again.");
      setProgressStep(-1);
      setIsGenerating(false);
    }
  };

  const handleNaturalLanguage = (description: string) =>
    generatePlan({ mode: "natural-language", description });

  const handleGuided = (options: Record<string, string>) =>
    generatePlan({ mode: "guided", options });

  const handleCreate = async (repoName: string, isPrivate: boolean) => {
    if (!plan) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/scaffold/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, repoName, isPrivate }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Failed to create repository");
        setIsCreating(false);
        return;
      }

      // API returns { taskId, status: "creating" } (HTTP 202) — poll work history
      if (data.taskId && data.status === "creating") {
        const pollFn = async () => {
          try {
            const pollRes = await fetch(`/api/history/${data.taskId}`);
            if (!pollRes.ok) return;
            const entry = await pollRes.json();

            if (entry.status === "completed" || entry.status === "failed") {
              if (createPollRef.current) {
                clearInterval(createPollRef.current);
                createPollRef.current = null;
              }

              if (entry.status === "completed") {
                const meta = entry.resultJson ? JSON.parse(entry.resultJson) : entry.metadata;
                if (meta?.repoUrl) {
                  setResult({ repoUrl: meta.repoUrl });
                }
              } else {
                setCreateError("Repository creation failed. Check work history for details.");
              }
              setIsCreating(false);
            }
          } catch {
            // Keep retrying on network errors
          }
        };

        pollFn();
        createPollRef.current = setInterval(pollFn, POLL_INTERVAL);
      } else if (data.repoUrl) {
        setResult({ repoUrl: data.repoUrl });
        setIsCreating(false);
      } else {
        setIsCreating(false);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Network error");
      setIsCreating(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Repo Created!</h1>
        <p className="text-sm text-muted-foreground">
          Your repository has been created:{" "}
          <a href={result.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            {result.repoUrl}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scaffold New Repo</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new repository from templates or natural language descriptions.</p>
      </div>

      <Tabs defaultValue="natural-language">
        <TabsList>
          <TabsTrigger value="natural-language">Natural Language</TabsTrigger>
          <TabsTrigger value="guided">Guided</TabsTrigger>
        </TabsList>
        <TabsContent value="natural-language" className="mt-4">
          <NaturalLanguageForm onSubmit={handleNaturalLanguage} isLoading={isGenerating} />
        </TabsContent>
        <TabsContent value="guided" className="mt-4">
          <GuidedForm onSubmit={handleGuided} isLoading={isGenerating} />
        </TabsContent>
      </Tabs>

      {isGenerating && progressStep >= 0 && (
        <ProgressIndicator currentStep={progressStep} />
      )}

      {planError && !isGenerating && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <p className="font-medium mb-1">Plan generation failed</p>
          <p>{planError}</p>
        </div>
      )}

      {plan && !isGenerating && (
        <>
          <ScaffoldPlanView
            plan={plan}
            knowledgeSources={knowledgeSources}
            onConfirm={handleCreate}
            isCreating={isCreating}
          />
          {createError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
              {createError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
