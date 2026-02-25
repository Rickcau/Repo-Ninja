"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NaturalLanguageForm } from "@/components/scaffold/natural-language-form";
import { GuidedForm } from "@/components/scaffold/guided-form";
import { ScaffoldPlanView } from "@/components/scaffold/scaffold-plan-view";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Search, Database, FileCode, Eye } from "lucide-react";
import type { ScaffoldPlan } from "@/lib/types";

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

  const generatePlan = async (body: any) => {
    setIsGenerating(true);
    setPlan(null);
    setProgressStep(0);

    // Run the progress animation and the API call concurrently
    const progressPromise = animateProgress();

    try {
      const res = await fetch("/api/scaffold/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      // Wait for animation to finish even if API is faster
      await progressPromise;

      if (data.plan) {
        setPlan(data.plan);
        setKnowledgeSources(data.knowledgeSources || []);
      }
    } catch {
      // If the API fails, still wait for animation then show empty plan view
      await progressPromise;
    } finally {
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
    try {
      const res = await fetch("/api/scaffold/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, repoName, isPrivate }),
      });
      const data = await res.json();
      if (data.repoUrl) setResult({ repoUrl: data.repoUrl });
    } finally {
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

      {plan && !isGenerating && (
        <ScaffoldPlanView
          plan={plan}
          knowledgeSources={knowledgeSources}
          onConfirm={handleCreate}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
