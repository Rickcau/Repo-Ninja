# Repo-Ninja: Full Implementation Task List

> **Purpose**: This document serves as an agentic task list for systematically implementing all mocked, stubbed, and missing features in the Repo-Ninja frontend and backend. Each task is broken into discrete, actionable steps designed to be executed by an AI agent or developer. All AI-powered features **must** use the GitHub Copilot SDK (`@github/copilot-sdk`).

---

## Table of Contents

1. [Architecture Prerequisites](#1-architecture-prerequisites)
2. [Persistent Data Store & Work Tracking](#2-persistent-data-store--work-tracking)
3. [Background Job System](#3-background-job-system)
4. [Dashboard — Replace All Mocked Data](#4-dashboard--replace-all-mocked-data)
5. [Agent System — Full Implementation](#5-agent-system--full-implementation)
6. [Code Reviews — End-to-End](#6-code-reviews--end-to-end)
7. [Repository Scaffolding — Complete the Loop](#7-repository-scaffolding--complete-the-loop)
8. [Knowledge Base — Live Metadata](#8-knowledge-base--live-metadata)
9. [Real-Time Updates (SSE/WebSocket)](#9-real-time-updates-ssewebsocket)
10. [Settings & Onboarding](#10-settings--onboarding)
11. [Testing & Quality](#11-testing--quality)

---

## 1. Architecture Prerequisites

These foundational tasks must be completed first — everything else depends on them.

### Task 1.1: Define Persistent Database Schema

**Why**: The current `agent-store.ts` writes to `/tmp/repo-ninja-agents.json` (lost on restart). Review reports use an in-memory Map. No work history is tracked. We need a real persistence layer.

**Steps**:
1. Choose and install a database client. SQLite via `better-sqlite3` is recommended for single-instance deployments; PostgreSQL via `prisma` for production scale.
2. Create a schema migration file at `src/lib/db/schema.ts` (or `prisma/schema.prisma`) with these tables:
   - `agent_tasks` — mirrors `AgentTask` type: `id, type, status, repo, description, branch, prUrl, progress (JSON), result (JSON), createdAt, updatedAt, userId`
   - `review_reports` — mirrors `ReviewReport`: `id, repo, reviewTypes (JSON), overallScore, categoryScores (JSON), findings (JSON), createdAt, userId`
   - `audit_reports` — mirrors `AuditReport`: `id, repo, complianceScore, checks (JSON), recommendations (JSON), createdAt, userId`
   - `work_history` — tracks all actions: `id, userId, actionType (enum: review|audit|scaffold|agent|kb-edit), entityId, repo, summary, status, startedAt, completedAt, metadata (JSON)`
   - `scaffold_plans` — persists scaffold plans: `id, repo, mode, description, plan (JSON), createdAt, userId`
3. Create a database initialization script at `src/lib/db/init.ts` that runs migrations on first startup.
4. Add a `DATABASE_URL` entry to `src/config/env.ts` with Zod validation and a sensible default (`file:./repo-ninja.db` for SQLite).
5. Update `docker-compose.yml` to mount a volume for the database file (or add a PostgreSQL service).
6. Write unit tests for the schema and migration in `src/__tests__/lib/db/`.

### Task 1.2: Create Data Access Layer (DAL)

**Why**: Centralize all database access so components and API routes don't directly write SQL/ORM queries.

**Steps**:
1. Create `src/lib/db/dal.ts` exporting these async functions:
   - **Agent Tasks**: `createAgentTask()`, `getAgentTask(id)`, `listAgentTasks(filter)`, `updateAgentTask(id, updates)`, `deleteAgentTask(id)`
   - **Review Reports**: `saveReviewReport(report)`, `getReviewReport(id)`, `listReviewReports(filter)`, `deleteReviewReport(id)`
   - **Audit Reports**: `saveAuditReport(report)`, `getAuditReport(id)`, `listAuditReports(filter)`
   - **Work History**: `logAction(action)`, `listActions(filter)`, `getAction(id)`
   - **Scaffold Plans**: `saveScaffoldPlan(plan)`, `getScaffoldPlan(id)`, `listScaffoldPlans(filter)`
2. Each function must use proper `async/await` — no synchronous file I/O.
3. Replace the file-based `agent-store.ts` with calls to the DAL. Keep the same exported function signatures for backward compatibility.
4. Replace the in-memory `report-store` (used by `/api/reviews/[reportId]`) with DAL calls.
5. Add pagination support: every `list*` function accepts `{ page: number, pageSize: number }` and returns `{ items: T[], total: number }`.
6. Write unit tests for each DAL function.

### Task 1.3: Create Work History Tracking Service

**Why**: The user requires a system that tracks all actions performed, their results, and completion status.

**Steps**:
1. Create `src/lib/services/work-tracker.ts` with a `WorkTracker` class:
   ```typescript
   class WorkTracker {
     async logStart(userId: string, actionType: ActionType, repo: string, summary: string): Promise<string> // returns workId
     async logProgress(workId: string, message: string): Promise<void>
     async logComplete(workId: string, result: Record<string, unknown>): Promise<void>
     async logFailure(workId: string, error: string): Promise<void>
     async getHistory(userId: string, filter?: WorkFilter): Promise<PaginatedResult<WorkHistoryEntry>>
     async getEntry(workId: string): Promise<WorkHistoryEntry | null>
   }
   ```
2. Define `ActionType` union: `"code-review" | "best-practices-audit" | "scaffold-plan" | "scaffold-create" | "agent-issue-solver" | "agent-code-writer" | "kb-edit" | "kb-reindex"`.
3. Integrate `WorkTracker` into every API route that performs a significant action (reviews, audits, scaffolding, agent starts, KB edits).
4. Create an API route `GET /api/history` that returns paginated work history for the authenticated user.
5. Create an API route `GET /api/history/[id]` that returns a single work history entry with full details.
6. Write unit tests.

---

## 2. Persistent Data Store & Work Tracking

> Depends on: [1.1](#task-11-define-persistent-database-schema), [1.2](#task-12-create-data-access-layer-dal)

### Task 2.1: Migrate Agent Store from File-Based to Database

**Steps**:
1. Update `src/lib/agent-store.ts` to import and delegate to the DAL functions from Task 1.2.
2. Remove all `readFileSync`/`writeFileSync`/`existsSync` calls.
3. Ensure `createTask()` is fully `async` and returns `Promise<AgentTask>`.
4. Ensure `updateTask()` is fully `async` and returns `Promise<AgentTask | null>`.
5. Ensure `listTasks()` supports pagination via the DAL.
6. Update all API routes that call `agent-store` functions to `await` them (check `/api/agents/start`, `/api/agents/tasks`, `/api/agents/[taskId]`).
7. Run existing tests; fix any broken imports.

### Task 2.2: Migrate Review Report Store from In-Memory to Database

**Steps**:
1. Locate the in-memory report store (used in `/api/reviews/start/route.ts` and `/api/reviews/[reportId]/route.ts`).
2. Replace `saveReport()` / `getReport()` calls with DAL functions `saveReviewReport()` / `getReviewReport()`.
3. Do the same for audit reports in `/api/reviews/audit/route.ts`.
4. Ensure the `GET /api/reviews/[reportId]` route now fetches from the database.
5. Write integration test: start a review → retrieve the report by ID → verify match.

### Task 2.3: Add Work History API Endpoints

**Steps**:
1. Create `src/app/api/history/route.ts`:
   - `GET` — returns paginated work history for authenticated user.
   - Query params: `page`, `pageSize`, `actionType` (optional filter), `repo` (optional filter).
2. Create `src/app/api/history/[id]/route.ts`:
   - `GET` — returns a single work history entry with full metadata.
3. Wire up `WorkTracker.logStart()` calls into:
   - `POST /api/agents/start` — log agent task start
   - `POST /api/reviews/start` — log review start
   - `POST /api/reviews/audit` — log audit start
   - `POST /api/scaffold/plan` — log scaffold plan generation
   - `POST /api/scaffold/create` — log repo creation
   - `POST /api/knowledge/reindex` — log reindex
4. Wire up `WorkTracker.logComplete()` / `logFailure()` in the same routes.
5. Write tests for each endpoint.

---

## 3. Background Job System

**Why**: The user requires long-running tasks (code reviews, agent operations, scaffolding) to run in the background with status polling. Currently, API routes block until the Copilot SDK call completes (up to 120 seconds).

### Task 3.1: Implement Background Task Runner

**Steps**:
1. Create `src/lib/services/task-runner.ts` with a `TaskRunner` class:
   ```typescript
   class TaskRunner {
     async enqueue<T>(taskId: string, work: () => Promise<T>): Promise<void>
     getStatus(taskId: string): TaskRunnerStatus // "queued" | "running" | "completed" | "failed"
     getResult<T>(taskId: string): T | null
     getError(taskId: string): string | null
   }
   ```
2. Internally, use a `Map<string, Promise<unknown>>` for in-flight tasks and store results/errors.
3. `enqueue` must execute the `work` function asynchronously using `Promise` chaining — do NOT `await` it inline. The function should fire-and-forget while tracking the promise.
4. Integrate with the DAL: on start, update `agent_tasks.status = "running"`; on complete, update to `"completed"` with result; on error, update to `"failed"`.
5. Integrate with `WorkTracker`: call `logProgress()` / `logComplete()` / `logFailure()` appropriately.
6. Export a singleton instance: `export const taskRunner = new TaskRunner()`.
7. Write unit tests using fake async work functions.

### Task 3.2: Refactor `/api/agents/start` to Use Background Execution

**Steps**:
1. Open `src/app/api/agents/start/route.ts`.
2. Move the long-running logic (GitHub fetch → ChromaDB search → Copilot SDK call → branch creation → commit → PR creation) into a named async function: `async function executeAgentTask(task, accessToken)`.
3. In the POST handler:
   - Create the task via DAL (status: `"queued"`).
   - Call `taskRunner.enqueue(task.id, () => executeAgentTask(task, accessToken))`.
   - Immediately return the task object with `status: "queued"` (HTTP 202 Accepted).
4. Inside `executeAgentTask`, update the task status to `"running"`, then execute each step with `updateTask()` progress messages.
5. On success, update task to `"completed"` with `result` (PR URL, summary).
6. On failure, update task to `"failed"` with error message.
7. The existing `GET /api/agents/[taskId]` endpoint already serves as the polling endpoint — verify it returns current status from the database.

### Task 3.3: Refactor `/api/reviews/start` to Use Background Execution

**Steps**:
1. Open `src/app/api/reviews/start/route.ts`.
2. Create a `reviewId` (nanoid) and save an initial `ReviewReport` with `status: "running"` to the database.
3. Move the long-running logic (file fetch → ChromaDB search → Copilot SDK review) into `async function executeReview(reviewId, request, accessToken)`.
4. Enqueue via `taskRunner.enqueue(reviewId, () => executeReview(...))`.
5. Return HTTP 202 with `{ id: reviewId, status: "running" }`.
6. Add a `status` field to the `ReviewReport` type: `"running" | "completed" | "failed"`.
7. Update `GET /api/reviews/[reportId]` to return the report including its status.
8. Update the frontend `reviews/page.tsx` to poll `GET /api/reviews/[reportId]` until status is `"completed"` or `"failed"`.

### Task 3.4: Refactor `/api/reviews/audit` to Use Background Execution

**Steps**:
1. Same pattern as Task 3.3 but for audit reports.
2. Create an `auditId`, save initial `AuditReport` with `status: "running"`.
3. Enqueue the Copilot SDK call.
4. Return HTTP 202 with `{ id: auditId, status: "running" }`.
5. Add `status` field to `AuditReport` type.
6. Update `GET /api/reviews/[reportId]` to handle both review and audit reports (or create a separate `GET /api/reviews/audit/[auditId]`).

### Task 3.5: Refactor `/api/scaffold/plan` and `/api/scaffold/create` to Use Background Execution

**Steps**:
1. For `POST /api/scaffold/plan`:
   - Create a `planId`, save initial scaffold plan with `status: "generating"`.
   - Enqueue the ChromaDB search + Copilot SDK call.
   - Return HTTP 202 with `{ planId, status: "generating" }`.
   - Create `GET /api/scaffold/plan/[planId]` to poll the plan status.
2. For `POST /api/scaffold/create`:
   - Similarly enqueue the repo creation + file generation.
   - Return HTTP 202 with `{ planId, status: "creating" }`.
   - The frontend should poll until status changes to `"completed"`.

### Task 3.6: Create Universal Status Polling Hook

**Steps**:
1. Create `src/hooks/use-task-status.ts`:
   ```typescript
   function useTaskStatus<T>(url: string, pollIntervalMs?: number): {
     data: T | null;
     status: "idle" | "polling" | "completed" | "failed";
     error: string | null;
     startPolling: () => void;
     stopPolling: () => void;
   }
   ```
2. The hook should:
   - Accept an API URL (e.g., `/api/agents/{taskId}`).
   - Poll at a configurable interval (default 3 seconds).
   - Auto-stop when the response indicates a terminal status (`completed`, `failed`, `cancelled`).
   - Use `useEffect` cleanup to stop polling on unmount.
3. Refactor the agents page (`src/app/agents/page.tsx`) to use this hook instead of one-shot fetch.
4. Refactor the reviews page to use this hook for review/audit progress.
5. Refactor the scaffold page to use this hook for plan generation and repo creation.
6. Write tests for the hook.

---

## 4. Dashboard — Replace All Mocked Data

> Depends on: [1.2](#task-12-create-data-access-layer-dal), [2.3](#task-23-add-work-history-api-endpoints)

### Task 4.1: Replace Dashboard Stats with Real Data

**File**: `src/app/page.tsx`

**Steps**:
1. Locate the hardcoded stats section in `page.tsx` (look for `"Replace with real API data"` TODO comments — there are 3).
2. Create `GET /api/dashboard/stats` endpoint at `src/app/api/dashboard/stats/route.ts`:
   - Query the DAL for counts: total reviews (completed), total agent tasks (completed), total scaffolded repos, total KB documents.
   - Return: `{ reviews: number, agentTasks: number, scaffoldedRepos: number, kbDocuments: number }`.
3. Add sparkline/trend data: query work history grouped by day for the last 7 days.
   - Return: `{ trends: { date: string, reviews: number, agents: number }[] }`.
4. Update `page.tsx` to fetch from `/api/dashboard/stats` on mount using `useEffect` + `useState`.
5. Replace the hardcoded sparkline data arrays with the real trend data.
6. Show `<SkeletonLoader />` while loading.

### Task 4.2: Replace Agent Activity Feed with Real Data

**File**: `src/components/dashboard/agent-activity-feed.tsx`

**Steps**:
1. Delete the `mockAgentActivities` array.
2. Fetch from `GET /api/agents/tasks?status=running` and `GET /api/agents/tasks?status=completed` (limit to 5 most recent).
3. Merge and sort by `updatedAt` descending.
4. Map each `AgentTask` to the activity feed item shape the component expects.
5. Calculate progress percentage from `task.progress.length` relative to expected steps (or add a `progressPercent` field to `AgentTask`).
6. Add a refresh interval (every 10 seconds) to keep the feed live.
7. Show `<SkeletonLoader />` while loading.

### Task 4.3: Replace System Health Panel with Real Data

**File**: `src/components/dashboard/system-health-panel.tsx`

**Steps**:
1. Delete `mockHealth` and `mockRecentReviews` constants.
2. Create `GET /api/dashboard/health` endpoint:
   - Fetch ChromaDB status via `chromaDBStore.getStatus()`.
   - Fetch GitHub API rate limit via Octokit: `octokit.rest.rateLimit.get()`.
   - Fetch 3 most recent review reports from the DAL.
   - Return: `{ chromadb: { connected, documentCount }, github: { used, limit }, recentReviews: ReviewReport[] }`.
3. Update the component to fetch from this endpoint.
4. Wire up real severity counts from `recentReviews[].findings` (count by severity).
5. Show `<SkeletonLoader />` while loading.

### Task 4.4: Replace Onboarding Checklist with Real Completion Detection

**File**: `src/components/dashboard/onboarding-checklist.tsx`

**Steps**:
1. Delete the hardcoded `steps` array with `complete: false` values.
2. Create `GET /api/dashboard/onboarding` endpoint:
   - Check if GitHub is connected: `session?.accessToken` exists → `true`.
   - Check if KB is indexed: `chromaDBStore.getStatus().documentCount > 0` → `true`.
   - Check if a review has been run: DAL `listReviewReports({ pageSize: 1 }).total > 0` → `true`.
   - Check if a scaffold has been created: DAL `listScaffoldPlans({ pageSize: 1 }).total > 0` → `true`.
   - Check if an agent task has been run: DAL `listAgentTasks({ pageSize: 1 }).total > 0` → `true`.
   - Check if settings have been configured: check env vars or a settings table.
3. Return: `{ steps: { id, label, complete }[] }`.
4. Update the component to fetch from this endpoint.
5. Show `<SkeletonLoader />` while loading.

---

## 5. Agent System — Full Implementation

> Depends on: [3.1](#task-31-implement-background-task-runner), [3.2](#task-32-refactor-apiagentsstart-to-use-background-execution)

### Task 5.1: Replace Agent Type Selector Mock Data

**File**: `src/components/agents/agent-type-selector.tsx`

**Steps**:
1. Delete the hardcoded `agentTypes` const (contains static descriptions and KB document lists).
2. Create `GET /api/agents/types` endpoint:
   - Query the KB (ChromaDB) for documents tagged with each agent type.
   - Return agent type metadata with the KB documents they use:
     ```json
     {
       "types": [
         { "id": "issue-solver", "label": "Issue Solver", "description": "...", "kbDocs": ["agent-instructions/issue-solver.md"] },
         { "id": "code-writer", "label": "Code Writer", "description": "...", "kbDocs": ["agent-instructions/code-writer.md"] }
       ]
     }
     ```
3. Update the component to fetch from this endpoint.
4. Fall back to a static default if the API call fails.

### Task 5.2: Implement Agent Task Pause/Resume/Cancel

**File**: `src/components/agents/agent-detail-panel.tsx`

**Steps**:
1. The UI already has pause/stop button placeholders. Wire them up.
2. Create `POST /api/agents/[taskId]/cancel` endpoint:
   - Update task status to `"cancelled"` in the DAL.
   - If the task is running in `TaskRunner`, set a cancellation flag.
3. Add a `cancelled` check inside `executeAgentTask` (from Task 3.2) — after each major step, check if the task has been cancelled and abort if so.
4. Update the `AgentTaskStatus` type to include `"cancelled"` (already exists in types.ts).
5. Wire the "Stop" button in `agent-detail-panel.tsx` to call `POST /api/agents/[taskId]/cancel`.
6. Wire the UI to show a "Cancelled" status badge.

### Task 5.3: Implement Agent Progress Streaming

**Why**: The execution timeline (`execution-timeline.tsx`) expects real-time step updates.

**Steps**:
1. The `updateTask()` function already supports `progressMessage`. Ensure each step of agent execution calls it:
   - "Fetching repository structure..."
   - "Searching knowledge base..."
   - "Generating code with Copilot..."
   - "Creating branch..."
   - "Committing files..."
   - "Creating pull request..."
2. Add timestamps to each progress message: `{ message: string, timestamp: string }` (update the `progress` field from `string[]` to `{ message: string, timestamp: string }[]` or keep appending formatted strings).
3. The frontend task detail panel should poll `GET /api/agents/[taskId]` and render progress updates in the `execution-timeline.tsx` component.
4. Add KB document retrieval scores to progress: when ChromaDB returns results, log `"Retrieved {n} KB docs (top score: {score})"`.

### Task 5.4: Store Agent Results to Repository

**Why**: The user requires that finished work results are stored back to the repo.

**Steps**:
1. After a successful agent task (code writer or issue solver), the system already commits files and creates a PR via `octokit`. Verify this works end-to-end.
2. Additionally, store a summary report as a file in the repo:
   - Create a file at `.repo-ninja/reports/{taskId}.md` in the target branch.
   - Content: task summary, files modified, KB documents used, Copilot prompt used, timestamps.
3. Update the `commitFiles()` call to include this report file.
4. Add the report URL to the `AgentTaskResult` object.

---

## 6. Code Reviews — End-to-End

> Depends on: [3.3](#task-33-refactor-apireviewsstart-to-use-background-execution), [3.4](#task-34-refactor-apireviewsaudit-to-use-background-execution)

### Task 6.1: Replace Review Form KB Data with Real Data

**File**: `src/components/reviews/review-form.tsx`

**Steps**:
1. Delete the hardcoded `REVIEW_TYPES` array that maps review types to KB document filenames.
2. Create `GET /api/reviews/types` endpoint:
   - Query the ChromaDB knowledge base for documents in the `review-instructions` category.
   - Group by review type tag (security, performance, accessibility, general).
   - Return: `{ types: [{ id, label, description, kbDocs: string[] }] }`.
3. Update the component to fetch from this endpoint.
4. Show a loading state while fetching.

### Task 6.2: Implement "Create GitHub Issue" from Finding

**File**: `src/components/reviews/review-results.tsx`

**Steps**:
1. Locate the `handleCreateIssue()` function (currently `console.log` placeholder with TODO).
2. Create `POST /api/reviews/create-issue` endpoint:
   - Accept: `{ repo, finding: ReviewFinding }`.
   - Use Octokit to create a GitHub issue:
     ```typescript
     octokit.rest.issues.create({
       owner, repo,
       title: `[${finding.severity.toUpperCase()}] ${finding.title}`,
       body: formatFindingAsIssueBody(finding),
       labels: [finding.category, finding.severity]
     })
     ```
   - Return: `{ issueNumber, issueUrl }`.
3. Update `handleCreateIssue()` to call this API, show a toast on success, and disable the button after creation.
4. Log this action in the work history via `WorkTracker`.

### Task 6.3: Implement "Apply Fix" from Finding

**File**: `src/components/reviews/review-results.tsx`

**Steps**:
1. Locate the `handleApplyFix()` function (currently `console.log` placeholder with TODO).
2. Create `POST /api/reviews/apply-fix` endpoint:
   - Accept: `{ repo, finding: ReviewFinding }` (the finding must have `suggestedCode` and `file`).
   - Use the Copilot SDK to generate the full file with the fix applied:
     - Build a prompt: "Apply this fix to the file: {finding.suggestion}. Original code: {originalCode}. Return the complete updated file content."
   - Use Octokit to create a branch (`repo-ninja/fix/{nanoid}`), commit the fix, and open a PR.
   - Return: `{ prUrl, branch }`.
3. Update `handleApplyFix()` to call this API and show the PR URL on success.
4. This is a long-running operation — use the background task pattern (enqueue, return task ID, poll).

### Task 6.4: Replace Review History with Real Data

**File**: `src/components/reviews/review-history.tsx`

**Steps**:
1. Delete the `MOCK_HISTORY` array (5 hardcoded reviews).
2. Create `GET /api/reviews/history` endpoint:
   - Query the DAL for all review and audit reports for the authenticated user.
   - Support query params: `page`, `pageSize`, `repo` (optional filter).
   - Return: `{ items: ReviewReport[], total: number }`.
3. Update the component to fetch from this endpoint.
4. Implement the "View Report" button:
   - Currently has a TODO: "Replace with real API call to fetch full review report".
   - Fetch from `GET /api/reviews/[reportId]` and display in a slide-out panel or navigate to a detail page.
5. Add pagination controls to the history list.

### Task 6.5: Add Review Progress Tracking to the Frontend

**File**: `src/app/reviews/page.tsx`

**Steps**:
1. After submitting a review (POST to `/api/reviews/start`), the API now returns HTTP 202 with `{ id, status: "running" }` (from Task 3.3).
2. Use the `useTaskStatus` hook (from Task 3.6) to poll `GET /api/reviews/{id}`.
3. Show a progress indicator while the review is running (reuse `<ProgressBar />` from shared components).
4. When status changes to `"completed"`, display the `<ReviewResults />` component with the full report.
5. When status changes to `"failed"`, show an error message with retry option.
6. Remove the mock fallback currently in the reviews page (the `catch` block that generates fake data).

---

## 7. Repository Scaffolding — Complete the Loop

> Depends on: [3.5](#task-35-refactor-apiscaffoldplan-and-apiscaffoldcreate-to-use-background-execution)

### Task 7.1: Replace Scaffold Plan Mock with Real Copilot SDK Data

**File**: `src/components/scaffold/scaffold-plan-view.tsx`

**Steps**:
1. Delete the `MOCK_PLAN` constant (contains a full hardcoded Next.js scaffold with 14 files).
2. The component already accepts a `plan` prop. Ensure the parent (`scaffold/page.tsx`) passes real data from the API.
3. After `POST /api/scaffold/plan` returns (now via background polling — Task 3.5), pass the real `ScaffoldPlan` to this component.
4. Keep the mock as a fallback ONLY when `plan.structure` is empty (the TODO already suggests this).
5. Render the real `bestPracticesApplied` and `knowledgeSources` arrays from the Copilot response.

### Task 7.2: Replace Guided Form Hardcoded Options with Dynamic Data

**File**: `src/components/scaffold/guided-form.tsx`

**Steps**:
1. The `OPTIONS` constant has hardcoded framework/language/auth/DB/styling/CI-CD choices.
2. Create `GET /api/scaffold/options` endpoint:
   - Query the ChromaDB knowledge base for documents in the `scaffolding` category.
   - Parse available templates and extract supported options.
   - Return: `{ frameworks: string[], languages: string[], auth: string[], databases: string[], styling: string[], cicd: string[] }`.
3. Update the component to fetch from this endpoint, falling back to hardcoded options on error.
4. This allows the KB to drive available scaffold templates.

### Task 7.3: Add Scaffold Progress Tracking

**Steps**:
1. After the user submits a scaffold request, use `useTaskStatus` to poll for the plan.
2. Show a progress bar or status message: "Searching knowledge base...", "Generating scaffold plan with Copilot...", "Plan ready!".
3. After the plan is shown and the user clicks "Create Repository", use `useTaskStatus` again to poll the creation.
4. Show progress: "Creating GitHub repository...", "Generating file contents...", "Committing files...", "Done!".
5. On completion, show the new repo URL with a link to GitHub.

### Task 7.4: Persist Scaffold Plans

**Steps**:
1. When a scaffold plan is generated, save it to the database via `saveScaffoldPlan()`.
2. Add a "Scaffold History" section to the scaffold page showing previous plans.
3. Allow users to re-use a previous plan to create a new repo.

---

## 8. Knowledge Base — Live Metadata

> Depends on: [1.2](#task-12-create-data-access-layer-dal)

### Task 8.1: Replace Document List Mock Metadata

**File**: `src/components/knowledge/document-list.tsx`

**Steps**:
1. Delete `MOCK_USED_BY` and `MOCK_CHUNKS` constants.
2. Create `GET /api/knowledge/metadata` endpoint:
   - For each KB document, query ChromaDB to get chunk count: `collection.count({ where: { filename } })`.
   - For each KB document, determine which agent types use it by checking the `review-instructions`, `agent-instructions`, `scaffolding` categories.
   - Return: `{ metadata: { [filename]: { chunks: number, usedBy: string[], lastIndexed: string } } }`.
3. Update the component to fetch from this endpoint.
4. Show `<SkeletonLoader />` while loading.

### Task 8.2: Replace Content Preview Mock Metadata

**File**: `src/components/knowledge/content-preview.tsx`

**Steps**:
1. Delete `MOCK_USED_BY`, `MOCK_CHUNKS`, and `MOCK_INDEX_STATUS` constants.
2. Reuse the `/api/knowledge/metadata` endpoint from Task 8.1.
3. For index status, calculate from the document's `updatedAt` timestamp: e.g., "Indexed 2h ago" based on time difference.
4. Update the component to accept metadata as a prop (fetched by the parent page).

### Task 8.3: Add Knowledge Base Index Health Check

**File**: `src/app/knowledge/page.tsx`

**Steps**:
1. Locate the placeholder index health check message (TODO comment).
2. Create `GET /api/knowledge/health` endpoint:
   - Check ChromaDB connection status.
   - Count total chunks in the collection.
   - Compare with the number of markdown files on disk — flag if out of sync.
   - Return: `{ healthy: boolean, totalChunks: number, totalDocs: number, outOfSync: string[] }`.
3. Show a warning banner in the KB page if `outOfSync.length > 0`, prompting the user to reindex.

---

## 9. Real-Time Updates (SSE/WebSocket)

**Why**: Polling works but provides a suboptimal UX. Server-Sent Events (SSE) are simpler to implement than WebSockets and work natively with HTTP.

### Task 9.1: Implement SSE Endpoint for Task Updates

**Steps**:
1. Create `GET /api/agents/[taskId]/stream` endpoint using Next.js streaming:
   ```typescript
   export async function GET(req, { params }) {
     const encoder = new TextEncoder();
     const stream = new ReadableStream({
       async start(controller) {
         // Poll the DAL every 2 seconds and push updates
         const interval = setInterval(async () => {
           const task = await getAgentTask(params.taskId);
           controller.enqueue(encoder.encode(`data: ${JSON.stringify(task)}\n\n`));
           if (["completed", "failed", "cancelled"].includes(task.status)) {
             clearInterval(interval);
             controller.close();
           }
         }, 2000);
       }
     });
     return new Response(stream, {
       headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
     });
   }
   ```
2. Create a React hook `useSSE(url)` that connects to the SSE endpoint and returns live task state.
3. Update `useTaskStatus` hook to prefer SSE when available, falling back to polling.
4. This is an enhancement — ensure the polling approach from Task 3.6 works first.

### Task 9.2: Implement SSE for Dashboard Activity Feed

**Steps**:
1. Create `GET /api/dashboard/activity-stream` SSE endpoint.
2. Push updates whenever any agent task changes status.
3. Update `agent-activity-feed.tsx` to use SSE for live updates instead of periodic refetch.

---

## 10. Settings & Onboarding

### Task 10.1: Add Work History to Settings Page

**File**: `src/app/settings/page.tsx`

**Steps**:
1. Add a new tab or section: "Activity History".
2. Fetch from `GET /api/history` (from Task 2.3).
3. Display a table with columns: Date, Action Type, Repository, Summary, Status, Duration.
4. Add filters: by action type, by repo, by date range.
5. Add a "View Details" link for each entry that navigates to a detail view.

### Task 10.2: Enhance Settings Health Checks

**File**: `src/app/settings/page.tsx`

**Steps**:
1. The settings page already has health checks for ChromaDB and GitHub. Enhance:
   - Show the database connection status (SQLite file exists / PostgreSQL connected).
   - Show the `TaskRunner` status: number of tasks queued, running, completed.
   - Show disk usage if using SQLite.
2. Add a "Test Copilot SDK Connection" button:
   - Call `askCopilot(token, "Hello, reply with OK")` and verify response.
   - Show success/failure status.

---

## 11. Testing & Quality

### Task 11.1: Unit Tests for New Services

**Steps**:
1. Write tests for `TaskRunner` (`src/__tests__/lib/services/task-runner.test.ts`):
   - Test enqueue and polling.
   - Test concurrent tasks.
   - Test failure handling.
2. Write tests for `WorkTracker` (`src/__tests__/lib/services/work-tracker.test.ts`):
   - Test logging start, progress, complete, failure.
   - Test history retrieval with filters.
3. Write tests for DAL functions (`src/__tests__/lib/db/dal.test.ts`):
   - CRUD operations for each entity.
   - Pagination.
   - Filtering.

### Task 11.2: Integration Tests for Background Operations

**Steps**:
1. Test the full flow: start agent → poll status → verify completion.
2. Test the full flow: start review → poll status → verify report.
3. Test cancellation: start agent → cancel → verify status is `"cancelled"`.
4. Test concurrent operations: start 3 agents simultaneously → all complete without interference.

### Task 11.3: Frontend Component Tests

**Steps**:
1. For each component that was updated to fetch real data, write a test that:
   - Mocks the API response.
   - Verifies the component renders the data correctly.
   - Verifies loading states are shown.
   - Verifies error states are handled.
2. Key components to test:
   - `agent-activity-feed.tsx`
   - `system-health-panel.tsx`
   - `onboarding-checklist.tsx`
   - `review-history.tsx`
   - `document-list.tsx`
   - `content-preview.tsx`

### Task 11.4: End-to-End Smoke Tests

**Steps**:
1. Write a test script that:
   - Starts the application.
   - Verifies the health endpoint returns `status: "ok"`.
   - Verifies the dashboard loads without errors.
   - Verifies the settings page shows correct service statuses.
2. Optionally use Playwright or Cypress for browser-based E2E tests.

---

## Dependency Graph

```
Task 1.1 (Database Schema)
  └── Task 1.2 (DAL)
       ├── Task 1.3 (Work Tracker)
       │    └── Task 2.3 (History API)
       │         ├── Task 4.1 (Dashboard Stats)
       │         └── Task 10.1 (Settings History)
       ├── Task 2.1 (Migrate Agent Store)
       ├── Task 2.2 (Migrate Report Store)
       └── Task 3.1 (Task Runner)
            ├── Task 3.2 (Agents Background) → Task 5.2, 5.3, 5.4
            ├── Task 3.3 (Reviews Background) → Task 6.5
            ├── Task 3.4 (Audit Background)
            ├── Task 3.5 (Scaffold Background) → Task 7.3
            └── Task 3.6 (Polling Hook)
                 ├── Task 4.2 (Activity Feed)
                 ├── Task 4.3 (Health Panel)
                 ├── Task 4.4 (Onboarding)
                 ├── Task 5.1 (Agent Types)
                 ├── Task 6.1 (Review Form KB)
                 ├── Task 6.2 (Create Issue)
                 ├── Task 6.3 (Apply Fix)
                 ├── Task 6.4 (Review History)
                 ├── Task 7.1 (Scaffold Plan)
                 ├── Task 7.2 (Guided Form)
                 ├── Task 7.4 (Scaffold History)
                 ├── Task 8.1 (KB Doc Metadata)
                 ├── Task 8.2 (KB Preview)
                 └── Task 8.3 (KB Health)

Task 9.1, 9.2 (SSE) — optional enhancement after polling works
Task 11.* (Testing) — can run in parallel throughout
```

---

## Execution Order (Recommended)

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| **Phase 1: Foundation** | 1.1 → 1.2 → 1.3 | Sequential |
| **Phase 2: Migration** | 2.1, 2.2, 2.3 | All parallel |
| **Phase 3: Background System** | 3.1 → 3.2, 3.3, 3.4, 3.5 (parallel) → 3.6 | Mixed |
| **Phase 4: Dashboard** | 4.1, 4.2, 4.3, 4.4 | All parallel |
| **Phase 5: Agents** | 5.1, 5.2, 5.3, 5.4 | All parallel |
| **Phase 6: Reviews** | 6.1, 6.2, 6.3, 6.4, 6.5 | All parallel |
| **Phase 7: Scaffolding** | 7.1, 7.2, 7.3, 7.4 | All parallel |
| **Phase 8: Knowledge Base** | 8.1, 8.2, 8.3 | All parallel |
| **Phase 9: Settings** | 10.1, 10.2 | Parallel |
| **Phase 10: Real-Time** | 9.1, 9.2 | Parallel |
| **Phase 11: Testing** | 11.1, 11.2, 11.3, 11.4 | Parallel (ongoing) |

---

## Key Technical Constraints

1. **All AI operations MUST use the GitHub Copilot SDK** (`@github/copilot-sdk` via `src/lib/copilot-sdk/client.ts`). Do not introduce OpenAI, Anthropic, or other LLM SDKs.
2. **All long-running operations MUST run in the background** with status polling or SSE. Never block the HTTP response for more than 5 seconds.
3. **All async operations MUST use proper `async/await`** — no callback-based patterns, no unhandled promise rejections.
4. **Results MUST be persisted** — to the database for internal tracking, and optionally to the target repo (`.repo-ninja/reports/`) for agent task outputs.
5. **Work history MUST be tracked** — every significant action (review, audit, scaffold, agent, KB edit) is logged with timestamps, user, repo, and outcome.
6. **Authentication** — all API routes that access user repos must verify `getServerSession()` and use the session's `accessToken`.
7. **Error handling** — all Copilot SDK calls must have try/catch with meaningful error messages stored in the task/report status.
8. **Type safety** — all new code must be TypeScript with strict mode. Update `src/lib/types.ts` for any new types.
