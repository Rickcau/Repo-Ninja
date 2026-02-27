"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RepoSelector } from "@/components/agents/repo-selector";
import { IssueList } from "@/components/agents/issue-list";
import { CodeWriterForm } from "@/components/agents/code-writer-form";
import { TaskList } from "@/components/agents/task-list";
import { AgentTypeSelector, type AgentTypeId } from "@/components/agents/agent-type-selector";
import { AgentDetailPanel, type AgentTaskDetail } from "@/components/agents/agent-detail-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import type { AgentTask, AgentTaskStatus } from "@/lib/types";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  GitPullRequest,
} from "lucide-react";

interface SelectedRepo {
  fullName: string;
  owner: string;
  name: string;
}

function TaskStatusIcon({ status }: { status: AgentTaskStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
    case "queued":
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-amber-500 shrink-0" />;
  }
}

export default function AgentsPage() {
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentTypeId | null>(null);
  const [assigningIssue, setAssigningIssue] = useState<number | null>(null);
  const [codeWriterSubmitting, setCodeWriterSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTask, setSelectedTask] = useState<AgentTaskDetail | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  const triggerRefresh = () => setRefreshTrigger((n) => n + 1);

  const fetchTasks = useCallback(() => {
    fetch("/api/agents/tasks")
      .then((res) => (res.ok ? res.json() : { tasks: [] }))
      .then((data) => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks, refreshTrigger]);

  const handleAssignIssue = async (issue: { number: number; title: string; body: string }) => {
    if (!selectedRepo) return;
    setAssigningIssue(issue.number);
    try {
      await fetch("/api/agents/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "issue-solver",
          repo: selectedRepo.fullName,
          description: `Solve issue #${issue.number}: ${issue.title}`,
          issueNumber: issue.number,
        }),
      });
      triggerRefresh();
    } catch {
      // Error handling is in the task list
    } finally {
      setAssigningIssue(null);
    }
  };

  const handleCodeWriter = async (description: string) => {
    if (!selectedRepo) return;
    setCodeWriterSubmitting(true);
    try {
      await fetch("/api/agents/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "code-writer",
          repo: selectedRepo.fullName,
          description,
        }),
      });
      triggerRefresh();
    } catch {
      // Error handling is in the task list
    } finally {
      setCodeWriterSubmitting(false);
    }
  };

  const handleTaskClick = async (task: AgentTask) => {
    // Fetch detailed info for this task
    try {
      const res = await fetch(`/api/agents/${task.id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedTask({
          id: detail.id,
          name: detail.description || task.description,
          repo: detail.repo || "",
          status: detail.status,
          type: detail.type || "custom-task",
          createdAt: detail.createdAt || new Date().toISOString(),
          steps: detail.steps || [],
          groundedIn: detail.groundedIn || [],
        });
        setDetailPanelOpen(true);
      }
    } catch {
      // Fallback: open panel with basic info
      setSelectedTask({
        id: task.id,
        name: task.description,
        repo: "",
        status: task.status,
        type: "custom-task",
        createdAt: new Date().toISOString(),
        steps: [],
        groundedIn: [],
      });
      setDetailPanelOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign AI agents to solve issues or write code in your repositories.
        </p>
      </div>

      {/* Repo Selector */}
      <Card>
        <CardContent className="pt-6">
          <label className="text-sm font-medium block mb-2">Select Repository</label>
          <RepoSelector onChange={setSelectedRepo} />
          {selectedRepo && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: <span className="font-mono">{selectedRepo.fullName}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Agent Type Selector */}
      {selectedRepo && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Choose Agent Type</h2>
          <AgentTypeSelector
            selected={selectedAgentType}
            onSelect={setSelectedAgentType}
          />
        </div>
      )}

      {selectedRepo && selectedAgentType && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Solver Section */}
          {(selectedAgentType === "issue-solver" || selectedAgentType === "custom-task") && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">Issue Solver</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select an open issue to assign to an AI agent for automated resolution.
                </p>
                <IssueList
                  owner={selectedRepo.owner}
                  repo={selectedRepo.name}
                  onAssign={handleAssignIssue}
                  assigningIssue={assigningIssue}
                />
              </CardContent>
            </Card>
          )}

          {/* Code Writer Section */}
          {(selectedAgentType === "code-writer" || selectedAgentType === "custom-task") && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">Code Writer</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Describe code you want written and an AI agent will generate it as a pull request.
                </p>
                <CodeWriterForm
                  onSubmit={handleCodeWriter}
                  isSubmitting={codeWriterSubmitting}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Agent Tasks from API */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Agent Tasks</h2>

          {tasks.length > 0 && (
            <div className="space-y-2 mb-6">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  className="w-full flex items-center gap-3 rounded-lg border bg-surface-card px-4 py-3 text-left transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
                  onClick={() => handleTaskClick(task)}
                >
                  <TaskStatusIcon status={task.status} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{task.description}</p>
                      {task.type && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize shrink-0">
                          {task.type.replace("-", " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.repo && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {task.repo}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "running" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    )}
                    {task.status === "completed" && task.result?.prUrl && (
                      <div className="flex items-center gap-1 text-xs text-emerald-500">
                        <GitPullRequest className="h-3 w-3" />
                        <span>PR</span>
                      </div>
                    )}
                    <StatusBadge status={task.status} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* TaskList component for additional real-time view */}
          <div className={tasks.length > 0 ? "border-t pt-4" : ""}>
            {tasks.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">Live API Tasks</p>
            )}
            <TaskList refreshTrigger={refreshTrigger} />
          </div>
        </CardContent>
      </Card>

      {/* Agent Detail Panel (Sheet slide-out) */}
      <AgentDetailPanel
        task={selectedTask}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />
    </div>
  );
}
