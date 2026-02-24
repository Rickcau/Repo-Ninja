"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NaturalLanguageForm } from "@/components/scaffold/natural-language-form";
import { GuidedForm } from "@/components/scaffold/guided-form";
import { ScaffoldPlanView } from "@/components/scaffold/scaffold-plan-view";
import type { ScaffoldPlan } from "@/lib/types";

export default function ScaffoldPage() {
  const [plan, setPlan] = useState<ScaffoldPlan | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ repoUrl: string } | null>(null);

  const generatePlan = async (body: any) => {
    setIsGenerating(true);
    setPlan(null);
    try {
      const res = await fetch("/api/scaffold/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setKnowledgeSources(data.knowledgeSources || []);
      }
    } finally {
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
        <p>
          Your repository has been created:{" "}
          <a href={result.repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            {result.repoUrl}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scaffold New Repo</h1>

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

      {plan && (
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
