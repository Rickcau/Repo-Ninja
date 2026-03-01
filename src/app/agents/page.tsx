"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRepoContext } from "@/lib/repo-context";
import { IssueList } from "@/components/agents/issue-list";
import { CodeWriterForm } from "@/components/agents/code-writer-form";
import { CustomTaskForm } from "@/components/agents/custom-task-form";
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
  Trash2,
} from "lucide-react";

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
  const { selectedRepo } = useRepoContext();
  const [selectedAgentType, setSelectedAgentType] = useState<AgentTypeId | null>(null);
  const [assigningIssue, setAssigningIssue] = useState<number | null>(null);
  const [codeWriterSubmitting, setCodeWriterSubmitting] = useState(false);
  const [customTaskSubmitting, setCustomTaskSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTask, setSelectedTask] = useState<AgentTaskDetail | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  const triggerRefresh = () => setRefreshTrigger((n) => n + 1);

  const handleClearTasks = async () => {
    if (!confirm("Clear all agent tasks? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/agents/tasks", { method: "DELETE" });
      if (res.ok) {
        setTasks([]);
        triggerRefresh();
      }
    } catch {
      // Silently fail
    }
  };

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

  const handleCustomTask = async (description: string) => {
    if (!selectedRepo) return;
    setCustomTaskSubmitting(true);
    try {
      await fetch("/api/agents/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom-task",
          repo: selectedRepo.fullName,
          description,
        }),
      });
      triggerRefresh();
    } catch {
      // Error handling is in the task list
    } finally {
      setCustomTaskSubmitting(false);
    }
  };

  const handleTaskClick = async (task: AgentTask) => {
    // Fetch detailed info for this task
    try {
      const res = await fetch(`/api/agents/${task.id}`);
      if (res.ok) {
        const json = await res.json();
        const detail = json.task ?? json;
        setSelectedTask({
          id: detail.id,
          name: detail.description || task.description,
          repo: detail.repo || "",
          status: detail.status,
          type: detail.type || "custom-task",
          createdAt: detail.createdAt || new Date().toISOString(),
          steps: detail.steps || [],
          groundedIn: detail.groundedIn || [],
          errorMessage: detail.status === "failed" ? (detail.result?.summary ?? detail.errorMessage) : undefined,
          progress: detail.progress || [],
          prUrl: detail.prUrl || detail.result?.prUrl,
          summary: detail.result?.summary,
        });
        setDetailPanelOpen(true);
      }
    } catch {
      // Fallback: open panel with basic info
      setSelectedTask({
        id: task.id,
        name: task.description,
        repo: task.repo || "",
        status: task.status,
        type: task.type || "custom-task",
        createdAt: task.createdAt || new Date().toISOString(),
        steps: [],
        groundedIn: [],
        errorMessage: task.status === "failed" ? task.result?.summary : undefined,
        progress: task.progress || [],
        prUrl: task.prUrl || task.result?.prUrl,
        summary: task.result?.summary,
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

      {/* No repo selected prompt */}
      {!selectedRepo && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Select a repository from the header dropdown to get started.
            </p>
          </CardContent>
        </Card>
      )}

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
          {selectedAgentType === "issue-solver" && (
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
          {selectedAgentType === "code-writer" && (
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

          {/* Custom Task Section */}
          {selectedAgentType === "custom-task" && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">Custom Task</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Give the agent any instruction and it will execute it against your repository, creating a pull request with the results.
                </p>
                <CustomTaskForm
                  onSubmit={handleCustomTask}
                  isSubmitting={customTaskSubmitting}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Agent Tasks from API */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Agent Tasks</h2>
            {tasks.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearTasks} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Tasks
              </Button>
            )}
          </div>

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
                    {task.status === "failed" && task.result?.summary && (
                      <p className="text-xs text-rose-400 mt-1 line-clamp-2">{task.result.summary}</p>
                    )}
                    {task.status === "running" && task.progress.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{task.progress[task.progress.length - 1]}</p>
                    )}
                  </div>

                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "running" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    )}
                    {task.status === "completed" && (task.prUrl || task.result?.prUrl) && (
                      <a
                        href={task.prUrl || task.result?.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GitPullRequest className="h-3 w-3" />
                        <span>View PR</span>
                      </a>
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
