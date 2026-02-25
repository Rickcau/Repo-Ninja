"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RepoSelector } from "@/components/agents/repo-selector";
import { IssueList } from "@/components/agents/issue-list";
import { CodeWriterForm } from "@/components/agents/code-writer-form";
import { TaskList } from "@/components/agents/task-list";
import { AgentTypeSelector, type AgentTypeId } from "@/components/agents/agent-type-selector";
import { AgentDetailPanel, type AgentTaskDetail } from "@/components/agents/agent-detail-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import type { AgentTaskStatus } from "@/lib/types";
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

// TODO: Replace with real API data
const mockTasks: {
  id: string;
  name: string;
  repo: string;
  status: AgentTaskStatus;
  type: string;
  progress: number;
  createdAt: string;
  detail: AgentTaskDetail;
}[] = [
  {
    id: "task-1",
    name: "Fix login redirect loop (#42)",
    repo: "acme/web-app",
    status: "completed",
    type: "issue-solver",
    progress: 100,
    createdAt: "2026-02-25T10:15:00Z",
    detail: {
      id: "task-1",
      name: "Fix login redirect loop (#42)",
      repo: "acme/web-app",
      status: "completed",
      type: "issue-solver",
      createdAt: "2026-02-25T10:15:00Z",
      steps: [
        { id: "s1", name: "Read issue", description: "Fetched issue #42 from GitHub", status: "complete", durationMs: 820 },
        {
          id: "s2",
          name: "Query knowledge base",
          description: "Retrieved relevant patterns for auth redirect handling",
          status: "complete",
          durationMs: 1240,
          retrievedDocs: [
            { name: "best-practices.md", section: "Auth Patterns", score: 0.94 },
            { name: "architecture-patterns.md", section: "Middleware Flow", score: 0.87 },
          ],
        },
        { id: "s3", name: "Generate solution", description: "Created fix for redirect loop in middleware.ts", status: "complete", durationMs: 3400 },
        { id: "s4", name: "Create PR", description: "Opened PR #43 with the fix", status: "complete", durationMs: 1600 },
        { id: "s5", name: "Run tests", description: "All 24 tests passed", status: "complete", durationMs: 8200 },
      ],
      groundedIn: [
        { name: "best-practices.md", section: "Auth Patterns - Redirect Guards" },
        { name: "architecture-patterns.md", section: "Middleware Flow - NextAuth Integration" },
        { name: "agent-instructions.md", section: "Issue Resolution Flow" },
      ],
    },
  },
  {
    id: "task-2",
    name: "Scaffold user settings page",
    repo: "acme/web-app",
    status: "running",
    type: "code-writer",
    progress: 60,
    createdAt: "2026-02-25T11:32:00Z",
    detail: {
      id: "task-2",
      name: "Scaffold user settings page",
      repo: "acme/web-app",
      status: "running",
      type: "code-writer",
      createdAt: "2026-02-25T11:32:00Z",
      steps: [
        { id: "s1", name: "Read issue", description: "Parsed natural-language description", status: "complete", durationMs: 210 },
        {
          id: "s2",
          name: "Query knowledge base",
          description: "Found scaffolding templates and style guides",
          status: "complete",
          durationMs: 980,
          retrievedDocs: [
            { name: "scaffolding-templates.md", section: "Settings Page", score: 0.91 },
            { name: "best-practices.md", section: "Form Validation", score: 0.82 },
          ],
        },
        { id: "s3", name: "Generate solution", description: "Writing components and API routes...", status: "in-progress" },
        { id: "s4", name: "Create PR", description: "Pending solution generation", status: "pending" },
        { id: "s5", name: "Run tests", description: "Waiting for PR creation", status: "pending" },
      ],
      groundedIn: [
        { name: "scaffolding-templates.md", section: "Settings Page Template" },
        { name: "best-practices.md", section: "Form Validation Patterns" },
      ],
    },
  },
  {
    id: "task-3",
    name: "Add rate limiting to /api/chat",
    repo: "acme/api-service",
    status: "failed",
    type: "issue-solver",
    progress: 40,
    createdAt: "2026-02-25T09:05:00Z",
    detail: {
      id: "task-3",
      name: "Add rate limiting to /api/chat",
      repo: "acme/api-service",
      status: "failed",
      type: "issue-solver",
      createdAt: "2026-02-25T09:05:00Z",
      steps: [
        { id: "s1", name: "Read issue", description: "Fetched issue #17 from GitHub", status: "complete", durationMs: 640 },
        {
          id: "s2",
          name: "Query knowledge base",
          description: "Found rate limiting patterns",
          status: "complete",
          durationMs: 1100,
          retrievedDocs: [
            { name: "best-practices.md", section: "Rate Limiting", score: 0.89 },
          ],
        },
        { id: "s3", name: "Generate solution", description: "Failed: insufficient context for Redis config", status: "complete", durationMs: 4200 },
        { id: "s4", name: "Create PR", description: "Skipped due to generation failure", status: "pending" },
        { id: "s5", name: "Run tests", description: "Skipped", status: "pending" },
      ],
      groundedIn: [
        { name: "best-practices.md", section: "Rate Limiting - Redis Integration" },
      ],
    },
  },
  {
    id: "task-4",
    name: "Audit CI pipeline config",
    repo: "acme/web-app",
    status: "queued",
    type: "custom-task",
    progress: 0,
    createdAt: "2026-02-25T11:45:00Z",
    detail: {
      id: "task-4",
      name: "Audit CI pipeline config",
      repo: "acme/web-app",
      status: "queued",
      type: "custom-task",
      createdAt: "2026-02-25T11:45:00Z",
      steps: [
        { id: "s1", name: "Read issue", description: "Waiting in queue", status: "pending" },
        { id: "s2", name: "Query knowledge base", description: "Pending", status: "pending" },
        { id: "s3", name: "Generate solution", description: "Pending", status: "pending" },
        { id: "s4", name: "Create PR", description: "Pending", status: "pending" },
        { id: "s5", name: "Run tests", description: "Pending", status: "pending" },
      ],
      groundedIn: [],
    },
  },
];

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

  const triggerRefresh = () => setRefreshTrigger((n) => n + 1);

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

  const handleTaskClick = (task: (typeof mockTasks)[number]) => {
    setSelectedTask(task.detail);
    setDetailPanelOpen(true);
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

      {/* Enhanced Task List with mock data */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Agent Tasks</h2>

          {/* Mock enriched task items */}
          <div className="space-y-2 mb-6">
            {mockTasks.map((task) => (
              <button
                key={task.id}
                className="w-full flex items-center gap-3 rounded-lg border bg-surface-card px-4 py-3 text-left transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
                onClick={() => handleTaskClick(task)}
              >
                <TaskStatusIcon status={task.status} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize shrink-0">
                      {task.type.replace("-", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      {task.repo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  {task.status === "running" && (
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                  {task.status === "completed" && (
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

          {/* Original task list from API */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">Live API Tasks</p>
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
