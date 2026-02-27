"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  LogOut,
  Github,
  Database,
  Activity,
  Info,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    chromadb: string;
  };
}

interface ChromaStatus {
  connected: boolean;
  documentCount?: number;
  collectionName?: string;
}

interface WorkHistoryEntry {
  id: string;
  actionType: string;
  repo: string | null;
  description: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  resultJson: string | null;
}

function WorkStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
  }
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [chromaStatus, setChromaStatus] = useState<ChromaStatus | null>(null);
  const [chromaLoading, setChromaLoading] = useState(true);
  const [chromaError, setChromaError] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<WorkHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchChromaStatus = async () => {
    setChromaLoading(true);
    setChromaError(null);
    try {
      const res = await fetch("/api/knowledge/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setChromaStatus(data);
    } catch (err) {
      setChromaError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setChromaLoading(false);
    }
  };

  const fetchHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/history?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistoryItems(data.items || []);
      setHistoryTotal(data.total || 0);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchChromaStatus();
    fetchHistory(1);
  }, []);

  useEffect(() => {
    fetchHistory(historyPage);
  }, [historyPage]);

  const refreshAll = () => {
    fetchHealth();
    fetchChromaStatus();
    fetchHistory(historyPage);
  };

  const totalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          <Button variant="destructive" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="history">Work History</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* GitHub Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Connection
                </CardTitle>
                <CardDescription>Your authenticated GitHub account</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionStatus === "loading" ? (
                  <p className="text-sm text-muted-foreground">Loading session...</p>
                ) : session?.user ? (
                  <div className="flex items-center gap-4">
                    {session.user.image && (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "Avatar"}
                        className="h-12 w-12 rounded-full border"
                      />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium">{session.user.name || "Unknown"}</p>
                      {session.user.email && (
                        <p className="text-sm text-muted-foreground">{session.user.email}</p>
                      )}
                      <Badge variant="outline" className="gap-1.5 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500" />
                        Connected
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="outline" className="gap-1.5 bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20">
                      <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0 bg-rose-500" />
                      Not Connected
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Sign in with GitHub to connect your account.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ChromaDB Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  ChromaDB
                </CardTitle>
                <CardDescription>Vector database for knowledge base</CardDescription>
              </CardHeader>
              <CardContent>
                {chromaLoading ? (
                  <p className="text-sm text-muted-foreground">Checking connection...</p>
                ) : chromaError ? (
                  <div className="space-y-2">
                    <Badge variant="outline" className="gap-1.5 bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20">
                      <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0 bg-rose-500" />
                      Error
                    </Badge>
                    <p className="text-sm text-muted-foreground">{chromaError}</p>
                  </div>
                ) : chromaStatus ? (
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className={
                        chromaStatus.connected
                          ? "gap-1.5 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "gap-1.5 bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                          chromaStatus.connected ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {chromaStatus.connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {chromaStatus.connected && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {chromaStatus.documentCount !== undefined && (
                          <p>Indexed chunks: {chromaStatus.documentCount}</p>
                        )}
                        {chromaStatus.collectionName && (
                          <p>Collection: {chromaStatus.collectionName}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Health Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Health Check
                </CardTitle>
                <CardDescription>Overall system health status</CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <p className="text-sm text-muted-foreground">Checking health...</p>
                ) : healthError ? (
                  <div className="space-y-2">
                    <Badge variant="outline" className="gap-1.5 bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20">
                      <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0 bg-rose-500" />
                      Error
                    </Badge>
                    <p className="text-sm text-muted-foreground">{healthError}</p>
                  </div>
                ) : health ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">API:</span>
                      <Badge
                        variant="outline"
                        className={
                          health.status === "ok"
                            ? "gap-1.5 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "gap-1.5 bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                            health.status === "ok" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {health.status === "ok" ? "Healthy" : health.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">ChromaDB:</span>
                      <Badge
                        variant="outline"
                        className={
                          health.services.chromadb === "connected"
                            ? "gap-1.5 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "gap-1.5 bg-rose-500/[0.12] text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                            health.services.chromadb === "connected" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {health.services.chromadb}
                      </Badge>
                    </div>
                    {health.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        Last checked: {new Date(health.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Environment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Environment
                </CardTitle>
                <CardDescription>Runtime and framework versions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next.js</span>
                    <span className="font-mono">16.1.6</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">React</span>
                    <span className="font-mono">19.2.3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NextAuth</span>
                    <span className="font-mono">4.x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ChromaDB Client</span>
                    <span className="font-mono">3.3.1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Work History
              </CardTitle>
              <CardDescription>
                All actions performed by the system — reviews, scaffolds, agent tasks, and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading history...</p>
              ) : historyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No work history yet. Start a review, scaffold, or agent task to see entries here.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {historyItems.map((entry) => (
                      <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <WorkStatusIcon status={entry.status} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{entry.description}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {entry.actionType.replace("-", " ")}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  entry.status === "completed"
                                    ? "text-[10px] px-1.5 py-0 bg-emerald-500/[0.12] text-emerald-600 border-emerald-500/20"
                                    : entry.status === "failed"
                                    ? "text-[10px] px-1.5 py-0 bg-rose-500/[0.12] text-rose-600 border-rose-500/20"
                                    : "text-[10px] px-1.5 py-0 bg-blue-500/[0.12] text-blue-600 border-blue-500/20"
                                }
                              >
                                {entry.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {entry.repo && (
                                <span className="font-mono">{entry.repo}</span>
                              )}
                              <span>{new Date(entry.startedAt).toLocaleString()}</span>
                              {entry.completedAt && (
                                <span>
                                  Duration:{" "}
                                  {Math.round(
                                    (new Date(entry.completedAt).getTime() -
                                      new Date(entry.startedAt).getTime()) /
                                      1000
                                  )}
                                  s
                                </span>
                              )}
                            </div>
                            {entry.error && (
                              <p className="text-xs text-rose-500 mt-1">{entry.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Page {historyPage} of {totalPages} ({historyTotal} entries)
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={historyPage <= 1}
                          onClick={() => setHistoryPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={historyPage >= totalPages}
                          onClick={() => setHistoryPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
