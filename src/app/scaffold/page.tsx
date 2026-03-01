"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NaturalLanguageForm } from "@/components/scaffold/natural-language-form";
import { GuidedForm } from "@/components/scaffold/guided-form";
import { TemplateSelector } from "@/components/scaffold/template-selector";
import { GenerateTemplateForm } from "@/components/scaffold/generate-template-form";
import { ScaffoldPlanView } from "@/components/scaffold/scaffold-plan-view";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Search, Database, FileCode, Eye, ExternalLink } from "lucide-react";
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

// SSE event from the scaffold agent
interface ScaffoldSSEEvent {
  type: "step" | "tool" | "tool_done" | "message" | "done" | "error";
  step?: string;
  detail?: string;
  name?: string;
  args?: string;
  content?: string;
  repoUrl?: string;
  repoName?: string;
  summary?: string;
  durationMs?: number;
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
  const [repoName, setRepoName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [activeTab, setActiveTab] = useState("from-template");
  // SSE streaming state for repo creation
  const [toolCalls, setToolCalls] = useState<Array<{ name: string; done: boolean }>>([]);
  const [agentMessages, setAgentMessages] = useState("");
  const [createSummary, setCreateSummary] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const planPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (planPollRef.current) clearInterval(planPollRef.current);
    };
  }, []);

  // Auto-scroll agent messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);



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

    const requestBody = { ...body, repoName };
    const progressPromise = animateProgress();

    try {
      const res = await fetch("/api/scaffold/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        await progressPromise;
        setPlanError(`Server returned an invalid response (HTTP ${res.status}). Check the server logs for details.`);
        setProgressStep(-1);
        setIsGenerating(false);
        return;
      }

      if (!res.ok) {
        await progressPromise;
        setPlanError((data.error as string) || `Plan generation failed (HTTP ${res.status})`);
        setProgressStep(-1);
        setIsGenerating(false);
        return;
      }

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
                if (!repoName && pollData.plan.repoName) {
                  setRepoName(pollData.plan.repoName);
                }
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
        await progressPromise;
        const planData = data.plan as ScaffoldPlan;
        setPlan(planData);
        setKnowledgeSources((data.knowledgeSources as string[]) || []);
        if (!repoName && planData.repoName) {
          setRepoName(planData.repoName);
        }
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

  const handleFromTemplate = (templateId: string, extraDescription: string) =>
    generatePlan({ mode: "from-template", templateId, extraDescription });

  const handleNaturalLanguage = (description: string) =>
    generatePlan({ mode: "natural-language", description });

  const handleGuided = (options: Record<string, string>) =>
    generatePlan({ mode: "guided", options });

  const handleUseGeneratedTemplate = (templateId: string) => {
    setActiveTab("from-template");
    sessionStorage.setItem("scaffold-preselect-template", templateId);
  };

  const handleCreate = async (createRepoName: string, isPrivate: boolean) => {
    if (!plan) return;
    setIsCreating(true);
    setCreateError(null);
    setToolCalls([]);
    setAgentMessages("");
    setCreateSummary(null);
    setResult(null);

    try {
      const res = await fetch("/api/scaffold/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, repoName: createRepoName, isPrivate }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setCreateError((data as { error?: string }).error || `Failed (HTTP ${res.status})`);
        setIsCreating(false);
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt: ScaffoldSSEEvent = JSON.parse(line.slice(6));
            if (evt.type === "step") {
              setToolCalls((prev) => [...prev, { name: evt.step ?? "step", done: true }]);
            } else if (evt.type === "tool") {
              setToolCalls((prev) => [...prev, { name: evt.name ?? "unknown", done: false }]);
            } else if (evt.type === "tool_done") {
              setToolCalls((prev) =>
                prev.map((t) =>
                  t.name === evt.name && !t.done ? { ...t, done: true } : t
                )
              );
            } else if (evt.type === "message") {
              setAgentMessages((prev) => prev + (evt.content ?? ""));
            } else if (evt.type === "done") {
              if (evt.repoUrl) setResult({ repoUrl: evt.repoUrl });
              setCreateSummary(evt.summary ?? "Done");
            } else if (evt.type === "error") {
              setCreateError(evt.detail ?? "Unknown error");
            }
          } catch { /* ignore malformed events */ }
        }
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Scaffold New Repo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new repository from knowledge-base templates, natural language, or build your own template with Copilot.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
            <div>
              <label className="text-sm font-medium">Repository Name</label>
              <Input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-awesome-project"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The repo will be created under your GitHub account.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select value={visibility} onValueChange={setVisibility} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="from-template">From Template</TabsTrigger>
          <TabsTrigger value="natural-language">Natural Language</TabsTrigger>
          <TabsTrigger value="guided">Guided</TabsTrigger>
          <TabsTrigger value="build-template">Build New Template</TabsTrigger>
        </TabsList>

        <TabsContent value="from-template" className="mt-4">
          <TemplateSelector onSubmit={handleFromTemplate} isLoading={isGenerating} />
        </TabsContent>

        <TabsContent value="natural-language" className="mt-4">
          <NaturalLanguageForm onSubmit={handleNaturalLanguage} isLoading={isGenerating} />
        </TabsContent>

        <TabsContent value="guided" className="mt-4">
          <GuidedForm onSubmit={handleGuided} isLoading={isGenerating} />
        </TabsContent>

        <TabsContent value="build-template" className="mt-4">
          <GenerateTemplateForm onUseTemplate={handleUseGeneratedTemplate} />
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
            onPlanChange={(updated) => setPlan(updated)}
            isCreating={isCreating}
            initialRepoName={repoName}
            initialVisibility={visibility}
          />

          {/* Live SSE creation progress */}
          {isCreating && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <p className="text-sm font-medium">Creating repository…</p>
              </div>
              {toolCalls.length > 0 && (
                <div className="space-y-1 pl-8">
                  {toolCalls.map((tc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {tc.done ? (
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                      )}
                      <span className="font-mono">{tc.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {agentMessages && (
                <div className="mt-3 border-t border-primary/10 pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Agent output</p>
                  <pre className="text-xs font-mono bg-muted/30 rounded-md p-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words">
                    {agentMessages}
                    <div ref={messagesEndRef} />
                  </pre>
                </div>
              )}
            </div>
          )}

          {result && !isCreating && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Repository created successfully!</p>
                {createSummary && (
                  <p className="text-xs text-muted-foreground mt-0.5">{createSummary}</p>
                )}
                <a
                  href={result.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1 break-all"
                >
                  {result.repoUrl}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            </div>
          )}

          {createError && !isCreating && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
              <p className="font-medium">Repository creation failed</p>
              <p className="text-xs opacity-90 mt-1">{createError}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
