"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, Loader2, Play, Zap, Bot, ExternalLink, Trash2 } from "lucide-react";

interface TestResult {
  step: string;
  status: "pass" | "fail" | "skip";
  detail: string;
  durationMs?: number;
}

const statusConfig = {
  pass: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", badge: "default" as const },
  fail: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", badge: "destructive" as const },
  skip: { icon: MinusCircle, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: "secondary" as const },
};

export default function TestCopilotPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async (skipSdkTest = false) => {
    setIsRunning(true);
    setResults([]);

    try {
      const res = await fetch("/api/test-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipSdkTest }),
      });

      if (!res.ok) {
        setResults([
          {
            step: "API Call",
            status: "fail",
            detail: `Test endpoint returned HTTP ${res.status}: ${await res.text().catch(() => "unknown")}`,
          },
        ]);
        return;
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setResults([
        {
          step: "Network",
          status: "fail",
          detail: `Failed to reach test endpoint: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Copilot SDK Test</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Diagnostic page to verify GitHub Copilot SDK connectivity. Tests authentication, CLI binary, and SDK communication.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => runTests(false)} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isRunning ? "Running Tests..." : "Run Full Test"}
        </Button>
        <Button variant="outline" onClick={() => runTests(true)} disabled={isRunning}>
          <Zap className="h-4 w-4 mr-2" />
          Quick Check (skip SDK call)
        </Button>
      </div>

      {results.length > 0 && (
        <>
          {/* Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Results: {passCount} passed, {failCount} failed, {results.length - passCount - failCount} skipped
                </span>
                {failCount === 0 && passCount > 0 && (
                  <Badge variant="default" className="bg-green-600">All Checks Passed</Badge>
                )}
                {failCount > 0 && (
                  <Badge variant="destructive">{failCount} Check{failCount > 1 ? "s" : ""} Failed</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Individual results */}
          <div className="space-y-3">
            {results.map((result, i) => {
              const cfg = statusConfig[result.status];
              const StatusIcon = cfg.icon;
              return (
                <Card key={i} className={cfg.bg}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{result.step}</span>
                          <Badge variant={cfg.badge} className="text-xs">
                            {result.status.toUpperCase()}
                          </Badge>
                          {result.durationMs !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {result.durationMs}ms
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                          {result.detail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Agent Scaffold Test ─────────────────────────────────── */}
      <AgentScaffoldTest />
    </div>
  );
}

// ── Agent Scaffold Test Panel ──────────────────────────────────────

interface StreamEvent {
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

function AgentScaffoldTest() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [agentMessage, setAgentMessage] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const run = async (cleanup: boolean) => {
    setIsRunning(true);
    setEvents([]);
    setAgentMessage("");
    setRepoUrl(null);
    setRepoName(null);
    setError(null);

    try {
      const res = await fetch("/api/test-copilot/agent-scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanup }),
      });

      if (!res.ok || !res.body) {
        setError(`HTTP ${res.status}: ${await res.text().catch(() => "unknown")}`);
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, "").trim();
          if (!dataLine) continue;
          try {
            const event: StreamEvent = JSON.parse(dataLine);
            setEvents((prev) => [...prev, event]);

            if (event.type === "message" && event.content) {
              setAgentMessage((prev) => prev + event.content);
            } else if (event.type === "done") {
              if (event.repoUrl) setRepoUrl(event.repoUrl);
              if (event.repoName) setRepoName(event.repoName);
            } else if (event.type === "error") {
              setError(event.detail ?? "Unknown error");
            }
          } catch {
            // skip unparseable
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const toolEvents = events.filter((e) => e.type === "tool" || e.type === "tool_done");
  const isDone = events.some((e) => e.type === "done");
  const doneEvent = events.find((e) => e.type === "done");

  return (
    <div className="space-y-4 border-t pt-8 mt-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-400" />
          Agent Scaffold Test
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Uses the Copilot SDK to create a repo and scaffold all files directly via the GitHub MCP tools.
          No issues, no PRs — files are committed straight to main. Watch the live progress below.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => run(false)} disabled={isRunning}>
          {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
          {isRunning ? "Scaffolding…" : "Scaffold Repo (keep alive)"}
        </Button>
        <Button variant="outline" onClick={() => run(true)} disabled={isRunning}>
          <Trash2 className="h-4 w-4 mr-2" />
          Scaffold + Delete after
        </Button>
      </div>

      {/* Live progress */}
      {(events.length > 0 || isRunning) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {isRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Live Progress</>
              ) : isDone ? (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Complete</>
              ) : error ? (
                <><XCircle className="h-4 w-4 text-red-500" /> Failed</>
              ) : null}
              {doneEvent?.durationMs && (
                <span className="text-xs text-muted-foreground font-normal ml-auto">
                  {(doneEvent.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Tool calls */}
            {toolEvents.length > 0 && (
              <div className="space-y-1">
                {toolEvents.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    {e.type === "tool" ? (
                      <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    )}
                    <span className="text-muted-foreground">
                      {e.type === "tool" ? `Calling: ${e.name}` : `Done: ${e.name}`}
                    </span>
                    {e.type === "tool" && e.args && (
                      <span className="text-muted-foreground/60 truncate max-w-[400px]">
                        {e.args.slice(0, 120)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Repo link */}
            {repoUrl && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {repoName ?? repoUrl}
              </a>
            )}

            {/* Error */}
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 rounded p-2">{error}</div>
            )}

            {/* Agent message */}
            {agentMessage && (
              <div className="mt-2">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => setShowRaw(!showRaw)}
                >
                  {showRaw ? "Hide agent response" : "Show agent response"}
                </button>
                {showRaw && (
                  <pre className="mt-1.5 text-[11px] font-mono bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {agentMessage}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
