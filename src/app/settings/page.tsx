"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, Github, Database, Activity, Info } from "lucide-react";

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

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [chromaStatus, setChromaStatus] = useState<ChromaStatus | null>(null);
  const [chromaLoading, setChromaLoading] = useState(true);
  const [chromaError, setChromaError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchHealth();
    fetchChromaStatus();
  }, []);

  const refreshAll = () => {
    fetchHealth();
    fetchChromaStatus();
  };

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
    </div>
  );
}
