"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Hammer, FileSearch, ShieldCheck, Github } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentTask } from "@/lib/types";

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Github className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Welcome to Repo-Ninja</h1>
        <p className="text-muted-foreground">
          Sign in with GitHub to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Connected as {session.user?.name || session.user?.email}
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/scaffold">
          <Button>
            <Hammer className="h-4 w-4 mr-2" />
            Scaffold New Repo
          </Button>
        </Link>
        <Link href="/reviews">
          <Button variant="outline">
            <FileSearch className="h-4 w-4 mr-2" />
            Start Code Review
          </Button>
        </Link>
        <Link href="/reviews?tab=audit">
          <Button variant="outline">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Run Audit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active agent tasks.</p>
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
                    <TableCell className="capitalize">{task.type.replace("-", " ")}</TableCell>
                    <TableCell>{task.repo}</TableCell>
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
