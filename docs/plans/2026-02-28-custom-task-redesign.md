# Custom Task Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Custom Task UI (which currently shows both Issue Solver and Code Writer panels) with a single free-form prompt textarea that sends `type: "custom-task"` to the backend, which processes it as a new agent type and always creates a PR.

**Architecture:** New `CustomTaskForm` component replaces the dual-panel display. Backend adds a `custom-task` branch in the start route that uses the user's prompt directly as the ChromaDB search query and Copilot instruction. Existing task list, detail panel, and PR link display work unchanged.

**Tech Stack:** React, Next.js App Router, Tailwind CSS, Copilot SDK, ChromaDB

---

### Task 1: Add `custom-task` to `AgentTaskType` union

**Files:**
- Modify: `src/lib/types.ts:47`

**Step 1: Update the type union**

In `src/lib/types.ts`, change line 47 from:

```typescript
export type AgentTaskType = "issue-solver" | "code-writer" | "code-review" | "best-practices-audit";
```

to:

```typescript
export type AgentTaskType = "issue-solver" | "code-writer" | "code-review" | "best-practices-audit" | "custom-task";
```

**Step 2: Verify the build compiles**

Run: `cd src && npx next build`
Expected: Build succeeds (no type errors)

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add custom-task to AgentTaskType union"
```

---

### Task 2: Add `buildCustomTaskPrompt` to prompts

**Files:**
- Modify: `src/lib/copilot-sdk/prompts.ts`

**Step 1: Add the prompt builder function**

Append to `src/lib/copilot-sdk/prompts.ts`:

```typescript
export function buildCustomTaskPrompt(
  userPrompt: string,
  repoContext: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert developer. The user has given you a custom task to perform on their repository. Follow their instructions precisely.

Relevant knowledge base documents:
${context}

User's task:
${userPrompt}

Repository structure:
${repoContext}

Generate the file changes needed to fulfill this task. For each file, provide the complete content.
Respond as JSON:
{
  "summary": "Brief description of what was done",
  "files": [
    { "path": "path/to/file.ext", "action": "create", "content": "full file content..." }
  ],
  "commitMessage": "feat: description of changes"
}

Be specific about file paths and follow existing patterns in the repository.`;
}
```

**Step 2: Commit**

```bash
git add src/lib/copilot-sdk/prompts.ts
git commit -m "feat: add buildCustomTaskPrompt for custom-task agent type"
```

---

### Task 3: Add `custom-task` branch to the start route

**Files:**
- Modify: `src/app/api/agents/start/route.ts`

**Step 1: Import the new prompt builder**

At line 15 of `src/app/api/agents/start/route.ts`, update the import:

```typescript
import { buildIssueSolverPrompt } from "@/lib/copilot-sdk/prompts";
```

to:

```typescript
import { buildIssueSolverPrompt, buildCustomTaskPrompt } from "@/lib/copilot-sdk/prompts";
```

**Step 2: Update the `logWorkStart` call to handle custom-task type**

In the `taskRunner.enqueue` callback (around line 61), change:

```typescript
      type === "issue-solver" ? "agent-issue-solver" : "agent-code-writer",
```

to:

```typescript
      type === "issue-solver" ? "agent-issue-solver" : type === "custom-task" ? "agent-custom-task" : "agent-code-writer",
```

**Step 3: Update the KB search query to use the user's prompt for custom-task**

Around line 96-98, change:

```typescript
      const knowledgeDocs = await store.search(
        type === "issue-solver" ? "agent instructions issue solving" : "agent instructions code writing",
        5
      );
```

to:

```typescript
      const kbQuery = type === "issue-solver"
        ? "agent instructions issue solving"
        : type === "custom-task"
          ? description
          : "agent instructions code writing";
      const knowledgeDocs = await store.search(kbQuery, 5);
```

**Step 4: Update the prompt builder selection to handle custom-task**

Around lines 109-112, change:

```typescript
      const prompt =
        type === "issue-solver"
          ? buildIssueSolverPrompt(issueTitle, issueBody, repoContext, knowledgeDocs)
          : buildCodeWriterPrompt(description, repoContext, knowledgeDocs);
```

to:

```typescript
      let prompt: string;
      if (type === "issue-solver") {
        prompt = buildIssueSolverPrompt(issueTitle, issueBody, repoContext, knowledgeDocs);
      } else if (type === "custom-task") {
        prompt = buildCustomTaskPrompt(description, repoContext, knowledgeDocs);
      } else {
        prompt = buildCodeWriterPrompt(description, repoContext, knowledgeDocs);
      }
```

**Step 5: Verify the build compiles**

Run: `cd src && npx next build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/api/agents/start/route.ts
git commit -m "feat: add custom-task handling in agent start route"
```

---

### Task 4: Create `CustomTaskForm` component

**Files:**
- Create: `src/components/agents/custom-task-form.tsx`

**Step 1: Create the component**

Create `src/components/agents/custom-task-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CustomTaskFormProps {
  onSubmit: (description: string) => void;
  isSubmitting: boolean;
}

export function CustomTaskForm({ onSubmit, isSubmitting }: CustomTaskFormProps) {
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description);
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="custom-task-description" className="text-sm font-medium block mb-1">
          Describe what you want the agent to do
        </label>
        <Textarea
          id="custom-task-description"
          placeholder="e.g., Review the full repo and understand what it's designed for, then document this in the README.md file in the root of the repo..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" disabled={isSubmitting || !description.trim()}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Starting Agent...
          </>
        ) : (
          "Start Task"
        )}
      </Button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/agents/custom-task-form.tsx
git commit -m "feat: add CustomTaskForm component for free-form agent prompts"
```

---

### Task 5: Wire `CustomTaskForm` into the agents page

**Files:**
- Modify: `src/app/agents/page.tsx`

**Step 1: Add import for CustomTaskForm**

At line 9 of `src/app/agents/page.tsx`, add after the CodeWriterForm import:

```typescript
import { CustomTaskForm } from "@/components/agents/custom-task-form";
```

**Step 2: Add state for custom task submission**

After the `codeWriterSubmitting` state (around line 44), add:

```typescript
const [customTaskSubmitting, setCustomTaskSubmitting] = useState(false);
```

**Step 3: Add handler for custom task submission**

After the `handleCodeWriter` function (around line 118), add:

```typescript
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
```

**Step 4: Replace the custom-task conditional rendering**

Replace the entire block from line 186 to line 221 (the grid with conditional Issue Solver and Code Writer sections):

```typescript
      {selectedRepo && selectedAgentType && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Solver Section */}
          {(selectedAgentType === "issue-solver" || selectedAgentType === "custom-task") && (
            ...
          )}

          {/* Code Writer Section */}
          {(selectedAgentType === "code-writer" || selectedAgentType === "custom-task") && (
            ...
          )}
        </div>
      )}
```

with:

```typescript
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
```

**Step 5: Verify the build compiles**

Run: `cd src && npx next build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/agents/page.tsx
git commit -m "feat: wire CustomTaskForm into agents page, replacing dual-panel display"
```

---

### Task 6: Verify PR link displays for custom-task

**Files:** None (verification only)

**Step 1: Verify existing PR link rendering handles custom-task**

Check `src/app/agents/page.tsx` lines 272-278 — the PR link display uses `task.result?.prUrl` which is type-agnostic. No changes needed.

Check `src/components/agents/agent-detail-panel.tsx` — verify it shows PR links for any task type.

**Step 2: Manual verification checklist**

1. Select a repo on the Agents page
2. Click "Custom Task" card
3. Verify only the Custom Task form appears (not Issue Solver or Code Writer)
4. Type a prompt and click "Start Task"
5. Verify task appears in the task list with `custom task` badge
6. Wait for completion
7. Verify PR link appears with the green PR icon
8. Click the task to open detail panel — verify execution timeline shows

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete custom-task agent type - free-form prompt with PR output"
```
