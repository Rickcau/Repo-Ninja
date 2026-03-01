# Custom Task Redesign — Design Doc

**Date:** 2026-02-28
**Status:** Approved

## Problem

When a user selects "Custom Task" on the Agent Management page, the UI shows both the Issue Solver (issue list) and Code Writer (text form) panels side-by-side. This is confusing — users expect a free-form prompt where they can give arbitrary instructions to the agent (e.g., "Review the full repo and document what it does in README.md").

## Solution

Replace the Custom Task UI with a single free-form prompt textarea and a "Start Task" button. The backend processes the prompt as a new `custom-task` agent type, using the user's instructions directly to drive the Copilot SDK. Output is always a PR with file changes. On completion, the PR link is displayed in the task list (this already works for existing agent types).

## Design Decisions

- **Output:** Always a PR (no report-only mode). Even documentation tasks produce file changes.
- **Form:** Minimal — just a textarea + button. No branch picker, no file filter. The agent determines everything from the prompt and repo context.
- **KB grounding:** The user's prompt is used as the ChromaDB search query to find relevant knowledge base documents automatically.

## Frontend Changes

### New component: `src/components/agents/custom-task-form.tsx`
- Textarea with placeholder: *"Describe what you want the agent to do..."*
- "Start Task" button (disabled while submitting or if prompt is empty)
- On submit: `POST /api/agents/start` with `{ type: "custom-task", repo, description }`
- Same pattern as `code-writer-form.tsx` — accepts `repo` and `onTaskStarted` props

### Modified: `src/app/agents/page.tsx`
- When `selectedAgentType === "custom-task"`, render `<CustomTaskForm>` instead of both Issue Solver and Code Writer panels.
- Remove the current logic that shows both panels for custom-task.

## Backend Changes

### Modified: `src/lib/types.ts`
- Add `"custom-task"` to `AgentTaskType` union.

### Modified: `src/app/api/agents/start/route.ts`
- Add a `custom-task` branch in the background worker that:
  1. Fetches repo tree context (reuse existing logic)
  2. Queries ChromaDB with the user's prompt as the search query
  3. Builds a prompt instructing the agent to fulfill the user's request, providing repo structure and KB docs as context
  4. Calls Copilot SDK, parses JSON response for file changes
  5. Creates branch (`repo-ninja/custom-task/{taskId}`), commits files, opens PR

### Modified: `src/app/api/agents/types/route.ts`
- Update the `custom-task` type metadata/description if needed.

## What Stays the Same

- Repo selector flow
- Task list with 5-second polling
- Detail panel with execution timeline
- PR link display on completed tasks
- KB document grounding shown in "Grounded In" section
