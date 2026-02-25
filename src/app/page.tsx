"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Hammer, FileSearch, ShieldCheck, Github, Bot, BookOpen, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentTask } from "@/lib/types";

const quickActions = [
  { href: "/scaffold", label: "Scaffold New Repo", icon: Hammer, variant: "default" as const },
  { href: "/reviews", label: "Start Code Review", icon: FileSearch, variant: "outline" as const },
  { href: "/reviews?tab=audit", label: "Run Audit", icon: ShieldCheck, variant: "outline" as const },
];

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mt-1">
          Connected as {session.user?.name || session.user?.email}
        </p>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Agents</span>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums">{runningCount}</p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            Vs last month
          </CardFooter>
        </Card>
        <Card featured>
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Completed Tasks</span>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums">{completedCount}</p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            Vs last month
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Tasks</span>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums">{tasks.length}</p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            Vs last month
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Knowledge Docs</span>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums">&mdash;</p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            Vs last month
          </CardFooter>
        </Card>
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

      {/* Active agents table */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Agent Activity</h2>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No agent tasks yet. Start one from the Agents page.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Repo</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.slice(0, 10).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="capitalize font-medium">{task.type.replace("-", " ")}</TableCell>
                    <TableCell className="font-mono text-xs">{task.repo}</TableCell>
                    <TableCell className="max-w-xs truncate">{task.description}</TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
