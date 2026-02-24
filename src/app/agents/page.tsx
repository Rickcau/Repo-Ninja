"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RepoSelector } from "@/components/agents/repo-selector";
import { IssueList } from "@/components/agents/issue-list";
import { CodeWriterForm } from "@/components/agents/code-writer-form";
import { TaskList } from "@/components/agents/task-list";

interface SelectedRepo {
  fullName: string;
  owner: string;
  name: string;
}

export default function AgentsPage() {
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [assigningIssue, setAssigningIssue] = useState<number | null>(null);
  const [codeWriterSubmitting, setCodeWriterSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

      {selectedRepo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Solver Section */}
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

          {/* Code Writer Section */}
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
        </div>
      )}

      {/* Task List */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Agent Tasks</h2>
          <TaskList refreshTrigger={refreshTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}
