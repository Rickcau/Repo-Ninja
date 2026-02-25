"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Sparkline } from "@/components/shared/sparkline";
import { AgentActivityFeed } from "@/components/dashboard/agent-activity-feed";
import { SystemHealthPanel } from "@/components/dashboard/system-health-panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import {
  Hammer,
  FileSearch,
  ShieldCheck,
  Github,
  Bot,
  BookOpen,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentTask } from "@/lib/types";

const quickActions = [
  { href: "/scaffold", label: "Scaffold New Repo", icon: Hammer, variant: "default" as const },
  { href: "/reviews", label: "Start Code Review", icon: FileSearch, variant: "outline" as const },
  { href: "/reviews?tab=audit", label: "Run Audit", icon: ShieldCheck, variant: "outline" as const },
];

// TODO: Replace with real API data
const mockSparklineData = {
  activeAgents: [1, 2, 1, 3, 2, 4, 3],
  completedTasks: [5, 8, 12, 10, 15, 18, 22],
  totalTasks: [8, 12, 16, 14, 20, 25, 30],
  kbDocuments: [40, 42, 42, 45, 48, 50, 52],
};

// TODO: Replace with real API data
const mockTrends = {
  activeAgents: { value: "+2", direction: "up" as const },
  completedTasks: { value: "+7", direction: "up" as const },
  totalTasks: { value: "+5", direction: "up" as const },
  kbDocuments: { value: "+4", direction: "up" as const },
};

// TODO: Replace with real API data
const mockKbStats = {
  chunkCount: 1_247,
  syncStatus: "synced" as const,
};

interface StatCardProps {
  href: string;
  icon: typeof Bot;
  label: string;
  value: string | number;
  sparklineData: number[];
  trend: { value: string; direction: "up" | "down" };
  featured?: boolean;
  subtitle?: string;
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  sparklineData,
  trend,
  featured,
  subtitle,
}: StatCardProps) {
  const TrendIcon = trend.direction === "up" ? TrendingUp : TrendingDown;
  const trendColor =
    trend.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <Link href={href} className="block">
      <Card
        featured={featured}
        className="transition-colors hover:bg-accent/30 cursor-pointer"
      >
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <Sparkline data={sparklineData} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              {trend.value}
              <TrendIcon className="h-3 w-3" />
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground gap-1">
          7-day trend
        </CardFooter>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  useEffect(() => {
    fetch("/api/agents/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="rounded-full bg-primary/10 p-6">
          <Github className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome to Repo-Ninja</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Your AI-powered command center for GitHub development workflows.
            Sign in with GitHub to get started.
          </p>
        </div>
      </div>
    );
  }

  const runningCount = tasks.filter((t) => t.status === "running").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const isFirstRun = tasks.length === 0 && runningCount === 0 && completedCount === 0;

  // Show onboarding when all metrics are zero
  if (isFirstRun) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mt-1">
            Connected as {session.user?.name || session.user?.email}
          </p>
        </div>
        <OnboardingChecklist userName={session.user?.name || "there"} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mt-1">
          Connected as {session.user?.name || session.user?.email}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          href="/agents"
          icon={Bot}
          label="Active Agents"
          value={runningCount}
          sparklineData={mockSparklineData.activeAgents}
          trend={mockTrends.activeAgents}
        />
        <StatCard
          href="/agents"
          icon={FileSearch}
          label="Completed Tasks"
          value={completedCount}
          sparklineData={mockSparklineData.completedTasks}
          trend={mockTrends.completedTasks}
          featured
        />
        <StatCard
          href="/agents"
          icon={Hammer}
          label="Total Tasks"
          value={tasks.length}
          sparklineData={mockSparklineData.totalTasks}
          trend={mockTrends.totalTasks}
        />
        <StatCard
          href="/knowledge"
          icon={BookOpen}
          label="KB Documents"
          value={mockKbStats.chunkCount.toLocaleString()}
          sparklineData={mockSparklineData.kbDocuments}
          trend={mockTrends.kbDocuments}
          subtitle={
            mockKbStats.syncStatus === "synced"
              ? "Synced"
              : "Syncing..."
          }
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button variant={action.variant}>
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Two-column bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AgentActivityFeed />
        </div>
        <div>
          <SystemHealthPanel />
        </div>
      </div>
    </div>
  );
}
