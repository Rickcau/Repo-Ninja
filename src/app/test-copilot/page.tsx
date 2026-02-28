"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, Loader2, Play, Zap } from "lucide-react";

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
    </div>
  );
}
