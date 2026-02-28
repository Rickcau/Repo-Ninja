# Repo-Ninja: Full Implementation Task List

> **Purpose**: This document serves as an agentic task list for systematically implementing all mocked, stubbed, and missing features in the Repo-Ninja frontend and backend. Each task is broken into discrete, actionable steps designed to be executed by an AI agent or developer. All AI-powered features **must** use the GitHub Copilot SDK (`@github/copilot-sdk`).

> **Last Updated**: 2026-02-28 — Status markers added for all completed, partial, and remaining work.

### Status Legend

| Icon | Meaning |
|------|---------|
| :white_check_mark: | **Completed** |
| :large_orange_diamond: | **Partially done** — core implemented, details remain |
| :x: | **Not started** |

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

### Task 1.1: Define Persistent Database Schema :white_check_mark:

**Why**: The current `agent-store.ts` writes to `/tmp/repo-ninja-agents.json` (lost on restart). Review reports use an in-memory Map. No work history is tracked. We need a real persistence layer.

**Status**: **Complete.** Prisma ORM with SQLite via `@prisma/adapter-better-sqlite3`. Schema at `prisma/schema.prisma` with 5 models: `AgentTask`, `ReviewReport`, `AuditReport`, `WorkHistory`, `ScaffoldPlan`. Initial migration at `prisma/migrations/20260228151010_init/`. Client singleton at `src/lib/db/prisma.ts`.

**Steps**:
1. ~~Choose and install a database client. SQLite via `better-sqlite3` is recommended for single-instance deployments; PostgreSQL via `prisma` for production scale.~~ :white_check_mark: Prisma 7 with `@prisma/adapter-better-sqlite3`.
2. ~~Create a schema migration file at `src/lib/db/schema.ts` (or `prisma/schema.prisma`) with these tables:~~ :white_check_mark: `prisma/schema.prisma`
   - `agent_tasks` — mirrors `AgentTask` type: `id, type, status, repo, description, branch, prUrl, progress (JSON), result (JSON), createdAt, updatedAt, userId`
   - `review_reports` — mirrors `ReviewReport`: `id, repo, reviewTypes (JSON), overallScore, categoryScores (JSON), findings (JSON), createdAt, userId`
   - `audit_reports` — mirrors `AuditReport`: `id, repo, complianceScore, checks (JSON), recommendations (JSON), createdAt, userId`
   - `work_history` — tracks all actions: `id, userId, actionType (enum: review|audit|scaffold|agent|kb-edit), entityId, repo, summary, status, startedAt, completedAt, metadata (JSON)`
   - `scaffold_plans` — persists scaffold plans: `id, repo, mode, description, plan (JSON), createdAt, userId`
3. ~~Create a database initialization script at `src/lib/db/init.ts` that runs migrations on first startup.~~ :white_check_mark: Prisma handles this via `prisma migrate dev` and `postinstall` script.
4. ~~Add a `DATABASE_URL` entry to `src/config/env.ts` with Zod validation and a sensible default (`file:./repo-ninja.db` for SQLite).~~ :large_orange_diamond: `DATABASE_URL` is in `.env` (default `file:./dev.db`). Zod validation not added.
5. :x: Update `docker-compose.yml` to mount a volume for the database file (or add a PostgreSQL service).
6. :x: Write unit tests for the schema and migration in `src/__tests__/lib/db/`.

### Task 1.2: Create Data Access Layer (DAL) :white_check_mark:

**Why**: Centralize all database access so components and API routes don't directly write SQL/ORM queries.

**Status**: **Complete.** `src/lib/db/dal.ts` — full DAL using Prisma Client with type-safe queries. All CRUD operations, pagination, filtering.

**Steps**:
1. ~~Create `src/lib/db/dal.ts` exporting these async functions:~~ :white_check_mark:
   - **Agent Tasks**: `createAgentTask()`, `getAgentTask(id)`, `listAgentTasks(filter)`, `updateAgentTask(id, updates)` :white_check_mark: (no `deleteAgentTask` yet)
   - **Review Reports**: `saveReviewReport(report)`, `getReviewReport(id)`, `listReviewReports(filter)` :white_check_mark: (no `deleteReviewReport` yet)
   - **Audit Reports**: `saveAuditReport(report)`, `getAuditReport(id)`, `listAuditReports(filter)` :white_check_mark:
   - **Work History**: `logWorkStart()`, `logWorkComplete()`, `logWorkFailure()`, `listWorkHistory(filter)`, `getWorkHistoryEntry(id)` :white_check_mark:
   - **Scaffold Plans**: `saveScaffoldPlan(plan)`, `getScaffoldPlan(id)`, `listScaffoldPlans(filter)`, `updateScaffoldPlanStatus()` :white_check_mark:
2. ~~Each function must use proper `async/await` — no synchronous file I/O.~~ :white_check_mark:
3. ~~Replace the file-based `agent-store.ts` with calls to the DAL.~~ :white_check_mark:
4. ~~Replace the in-memory `report-store` with DAL calls.~~ :white_check_mark:
5. ~~Add pagination support: every `list*` function accepts `{ page: number, pageSize: number }` and returns `{ items: T[], total: number }`.~~ :white_check_mark:
6. :x: Write unit tests for each DAL function.

### Task 1.3: Create Work History Tracking Service :white_check_mark:

**Why**: The user requires a system that tracks all actions performed, their results, and completion status.

**Status**: **Complete.** Work tracking functions (`logWorkStart`, `logWorkComplete`, `logWorkFailure`) are in the DAL and integrated into API routes for agents, reviews, and audits.

**Steps**:
1. ~~Create work tracking functions~~ :white_check_mark: Implemented directly in DAL (`logWorkStart`, `logWorkComplete`, `logWorkFailure`, `listWorkHistory`, `getWorkHistoryEntry`).
2. ~~Define `ActionType` union~~ :white_check_mark: `"code-review" | "best-practices-audit" | "scaffold-plan" | "scaffold-create" | "agent-issue-solver" | "agent-code-writer" | "kb-edit" | "kb-reindex"`
3. ~~Integrate into API routes~~ :white_check_mark: Integrated into `/api/agents/start`, `/api/reviews/start`, `/api/reviews/audit`.
4. ~~Create `GET /api/history`~~ :white_check_mark: `src/app/api/history/route.ts`
5. ~~Create `GET /api/history/[id]`~~ :white_check_mark: `src/app/api/history/[id]/route.ts`
6. :x: Write unit tests.

---

## 2. Persistent Data Store & Work Tracking

> Depends on: [1.1](#task-11-define-persistent-database-schema), [1.2](#task-12-create-data-access-layer-dal)

### Task 2.1: Migrate Agent Store from File-Based to Database :white_check_mark:

**Status**: **Complete.** `src/lib/agent-store.ts` now delegates to async DAL functions. All API routes updated to `await`.

**Steps**:
1. ~~Update `src/lib/agent-store.ts` to import and delegate to the DAL functions.~~ :white_check_mark:
2. ~~Remove all `readFileSync`/`writeFileSync`/`existsSync` calls.~~ :white_check_mark:
3. ~~Ensure `createTask()` is fully `async` and returns `Promise<AgentTask>`.~~ :white_check_mark:
4. ~~Ensure `updateTask()` is fully `async` and returns `Promise<AgentTask | null>`.~~ :white_check_mark:
5. ~~Ensure `listTasks()` supports pagination via the DAL.~~ :white_check_mark:
6. ~~Update all API routes that call `agent-store` functions to `await` them.~~ :white_check_mark: Updated `/api/agents/start`, `/api/agents/tasks`, `/api/agents/[taskId]`.
7. ~~Run existing tests; fix any broken imports.~~ :white_check_mark: Tests updated to `async/await`.

### Task 2.2: Migrate Review Report Store from In-Memory to Database :white_check_mark:

**Status**: **Complete.** `src/app/api/reviews/report-store.ts` now delegates to DAL.

**Steps**:
1. ~~Replace `saveReport()` / `getReport()` calls with DAL functions.~~ :white_check_mark:
2. ~~Do the same for audit reports.~~ :white_check_mark:
3. ~~Ensure the `GET /api/reviews/[reportId]` route now fetches from the database.~~ :white_check_mark:
4. :x: Write integration test: start a review → retrieve the report by ID → verify match.

### Task 2.3: Add Work History API Endpoints :white_check_mark:

**Status**: **Complete.**

**Steps**:
1. ~~Create `src/app/api/history/route.ts`~~ :white_check_mark: GET with `page`, `pageSize`, `actionType`, `repo` filters.
2. ~~Create `src/app/api/history/[id]/route.ts`~~ :white_check_mark:
3. ~~Wire up `logWorkStart()` calls into API routes~~ :white_check_mark: Wired into `/api/agents/start`, `/api/reviews/start`, `/api/reviews/audit`.
4. ~~Wire up `logWorkComplete()` / `logWorkFailure()`~~ :white_check_mark:
5. :x: Write tests for each endpoint.

---

## 3. Background Job System

**Why**: The user requires long-running tasks (code reviews, agent operations, scaffolding) to run in the background with status polling. Currently, API routes block until the Copilot SDK call completes (up to 120 seconds).

### Task 3.1: Implement Background Task Runner :white_check_mark:

**Status**: **Complete.** `src/lib/services/task-runner.ts` — singleton with `enqueue()`, `cancel()`, `isCancelled()`, `getStatus()`.

**Steps**:
1. ~~Create `src/lib/services/task-runner.ts`~~ :white_check_mark:
2. ~~Internally, use a `Map<string, Promise<unknown>>` for in-flight tasks.~~ :white_check_mark:
3. ~~`enqueue` must execute the `work` function asynchronously — fire-and-forget.~~ :white_check_mark:
4. ~~Integrate with the DAL.~~ :white_check_mark:
5. ~~Integrate with `WorkTracker`.~~ :white_check_mark:
6. ~~Export a singleton instance.~~ :white_check_mark: `export const taskRunner = new TaskRunner()`
7. :x: Write unit tests.

### Task 3.2: Refactor `/api/agents/start` to Use Background Execution :white_check_mark:

**Status**: **Complete.** Returns HTTP 202 immediately. Background execution via `taskRunner.enqueue()`. Includes cancellation checks between steps.

**Steps**:
1. ~~Move long-running logic into a named async function.~~ :white_check_mark: `executeAgentTask()`
2. ~~Create task via DAL, enqueue, return HTTP 202.~~ :white_check_mark:
3. ~~Inside `executeAgentTask`, update status to "running" and log progress.~~ :white_check_mark:
4. ~~On success, update to "completed" with result.~~ :white_check_mark:
5. ~~On failure, update to "failed".~~ :white_check_mark:
6. ~~Verify `GET /api/agents/[taskId]` serves as polling endpoint.~~ :white_check_mark:

### Task 3.3: Refactor `/api/reviews/start` to Use Background Execution :large_orange_diamond:

**Status**: **Partially done.** Work tracking added (`logWorkStart`/`logWorkComplete`/`logWorkFailure`). Report saved to DB. But the route still blocks — not yet enqueued as a background task.

**Remaining**:
- Move the Copilot SDK call into a background task via `taskRunner.enqueue()`.
- Return HTTP 202 with `{ id, status: "running" }`.
- Add `status` field handling to the review response.

### Task 3.4: Refactor `/api/reviews/audit` to Use Background Execution :large_orange_diamond:

**Status**: **Partially done.** Same as Task 3.3 — work tracking added but route still blocks.

**Remaining**:
- Enqueue audit work as background task.
- Return HTTP 202.

### Task 3.5: Refactor `/api/scaffold/plan` and `/api/scaffold/create` to Use Background Execution :x:

**Status**: **Not started.** DAL has `saveScaffoldPlan()` and `updateScaffoldPlanStatus()` ready, but scaffold API routes not yet refactored.

### Task 3.6: Create Universal Status Polling Hook :white_check_mark:

**Status**: **Complete.** `src/hooks/use-task-status.ts` — generic polling hook with auto-start, auto-stop on terminal status, configurable interval.

**Steps**:
1. ~~Create `src/hooks/use-task-status.ts`~~ :white_check_mark:
2. ~~Auto-stop on terminal status.~~ :white_check_mark:
3. ~~Use `useEffect` cleanup.~~ :white_check_mark:
4. :large_orange_diamond: Agents page uses `setInterval` for refresh (not the hook directly). Hook is available for use.
5. :large_orange_diamond: Reviews page not yet wired to use the hook.
6. :x: Write tests for the hook.

---

## 4. Dashboard — Replace All Mocked Data

> Depends on: [1.2](#task-12-create-data-access-layer-dal), [2.3](#task-23-add-work-history-api-endpoints)

### Task 4.1: Replace Dashboard Stats with Real Data :white_check_mark:

**File**: `src/app/page.tsx`

**Status**: **Complete.** Removed `mockSparklineData`, `mockTrends`, `mockKbStats`. Page fetches from `/api/dashboard/stats`. API endpoint queries DAL for real counts (activeAgents, completedTasks, totalTasks, kbDocuments via ChromaDB).

### Task 4.2: Replace Agent Activity Feed with Real Data :white_check_mark:

**File**: `src/components/dashboard/agent-activity-feed.tsx`

**Status**: **Complete.** Removed `mockAgentActivities`. Fetches from `/api/agents/tasks`. 10-second auto-refresh. Shows `<SkeletonText />` while loading.

### Task 4.3: Replace System Health Panel with Real Data :white_check_mark:

**File**: `src/components/dashboard/system-health-panel.tsx`

**Status**: **Complete.** Removed `mockHealth` and `mockRecentReviews`. Fetches from `/api/dashboard/health`. API checks ChromaDB, GitHub rate limit, and recent reviews.

### Task 4.4: Replace Onboarding Checklist with Real Completion Detection :white_check_mark:

**File**: `src/components/dashboard/onboarding-checklist.tsx`

**Status**: **Complete.** Removed hardcoded `steps` array. Fetches from `/api/dashboard/onboarding`. API checks GitHub connection, KB index, reviews, scaffolds, and agents in the DB.

---

## 5. Agent System — Full Implementation

> Depends on: [3.1](#task-31-implement-background-task-runner), [3.2](#task-32-refactor-apiagentsstart-to-use-background-execution)

### Task 5.1: Replace Agent Type Selector Mock Data :white_check_mark:

**File**: `src/components/agents/agent-type-selector.tsx`

**Status**: **Complete.** Removed hardcoded `agentTypes` with mock KB docs. Now fetches from `/api/agents/types` for dynamic KB document lists. Static agent type definitions (id, title, description, icon) remain as constants since they're UI concerns.

### Task 5.2: Implement Agent Task Pause/Resume/Cancel :white_check_mark:

**Status**: **Complete.** `POST /api/agents/[taskId]/cancel` endpoint created. `taskRunner.isCancelled()` checked between major steps in `executeAgentTask`. `AgentTaskStatus` already includes `"cancelled"`.

### Task 5.3: Implement Agent Progress Streaming :white_check_mark:

**Status**: **Complete.** SSE endpoint at `GET /api/agents/[taskId]/stream`. Polls DAL every 2 seconds and pushes task state. Auto-closes on terminal status.

### Task 5.4: Store Agent Results to Repository :x:

**Status**: **Not started.**

**Remaining**:
- After successful agent task, create `.repo-ninja/reports/{taskId}.md` in target branch.
- Include task summary, files modified, KB documents used, timestamps.
- Add report URL to `AgentTaskResult`.

---

## 6. Code Reviews — End-to-End

> Depends on: [3.3](#task-33-refactor-apireviewsstart-to-use-background-execution), [3.4](#task-34-refactor-apireviewsaudit-to-use-background-execution)

### Task 6.1: Replace Review Form KB Data with Real Data :x:

**File**: `src/components/reviews/review-form.tsx`

**Status**: **Not started.** `REVIEW_TYPES` still hardcoded.

**Remaining**:
- Create `GET /api/reviews/types` endpoint to query ChromaDB for review instruction documents.
- Update component to fetch dynamically.

### Task 6.2: Implement "Create GitHub Issue" from Finding :white_check_mark:

**File**: `src/components/reviews/review-results.tsx`

**Status**: **Complete.** `POST /api/reviews/create-issue` endpoint created. Uses Octokit to create GitHub issue with severity label. `handleCreateIssue()` in component calls the API.

### Task 6.3: Implement "Apply Fix" from Finding :white_check_mark:

**File**: `src/components/reviews/review-results.tsx`

**Status**: **Complete.** `POST /api/reviews/apply-fix` endpoint created. Enqueues background task: Copilot generates fix → creates branch → commits → opens PR. Returns task ID for polling.

### Task 6.4: Replace Review History with Real Data :white_check_mark:

**File**: `src/components/reviews/review-history.tsx`

**Status**: **Complete.** Removed `MOCK_HISTORY`. Fetches from `/api/reviews/history` which merges review_reports + audit_reports sorted by date.

### Task 6.5: Add Review Progress Tracking to the Frontend :large_orange_diamond:

**File**: `src/app/reviews/page.tsx`

**Status**: **Partially done.** `MOCK_REVIEW_REPORT` and mock fallback in `catch` block removed. Reviews page calls real API. But the `useTaskStatus` polling hook is not yet wired in — reviews still block on the API call rather than polling. History select handler fetches real report data.

**Remaining**:
- Wire `useTaskStatus` hook for polling after `/api/reviews/start` returns HTTP 202 (requires Task 3.3 completion).

---

## 7. Repository Scaffolding — Complete the Loop

> Depends on: [3.5](#task-35-refactor-apiscaffoldplan-and-apiscaffoldcreate-to-use-background-execution)

### Task 7.1: Replace Scaffold Plan Mock with Real Copilot SDK Data :white_check_mark:

**File**: `src/components/scaffold/scaffold-plan-view.tsx`

**Status**: **Complete.** Removed `MOCK_PLAN` constant. Component now uses real `plan` prop directly. Shows empty state placeholder when `plan.structure` is empty. Conditionally renders bestPracticesApplied and knowledgeSources only when arrays are non-empty.

### Task 7.2: Replace Guided Form Hardcoded Options with Dynamic Data :x:

**File**: `src/components/scaffold/guided-form.tsx`

**Status**: **Not started.** `OPTIONS` constant still hardcoded.

**Remaining**:
- Create `GET /api/scaffold/options` endpoint.
- Query ChromaDB for scaffolding templates.
- Update component to fetch dynamically.

### Task 7.3: Add Scaffold Progress Tracking :x:

**Status**: **Not started.** Requires Task 3.5 (scaffold background execution).

### Task 7.4: Persist Scaffold Plans :large_orange_diamond:

**Status**: **Partially done.** DAL has full `saveScaffoldPlan()`, `getScaffoldPlan()`, `updateScaffoldPlanStatus()`, `listScaffoldPlans()`. But scaffold page not yet wired to save/load plans from the database.

---

## 8. Knowledge Base — Live Metadata

> Depends on: [1.2](#task-12-create-data-access-layer-dal)

### Task 8.1: Replace Document List Mock Metadata :white_check_mark:

**File**: `src/components/knowledge/document-list.tsx`

**Status**: **Complete.** Removed `MOCK_USED_BY` and `MOCK_CHUNKS`. "Used by" now derived from document category. Chunk count fetched from `/api/knowledge/status`.

### Task 8.2: Replace Content Preview Mock Metadata :white_check_mark:

**File**: `src/components/knowledge/content-preview.tsx`

**Status**: **Complete.** Removed all `MOCK_*` constants. "Used by" derived from category. Chunk data fetched from API.

### Task 8.3: Add Knowledge Base Index Health Check :x:

**File**: `src/app/knowledge/page.tsx`

**Status**: **Not started.**

**Remaining**:
- Create `GET /api/knowledge/health` endpoint.
- Check ChromaDB sync status.
- Show warning banner if out of sync.

---

## 9. Real-Time Updates (SSE/WebSocket)

**Why**: Polling works but provides a suboptimal UX. Server-Sent Events (SSE) are simpler to implement than WebSockets and work natively with HTTP.

### Task 9.1: Implement SSE Endpoint for Task Updates :white_check_mark:

**Status**: **Complete.** `GET /api/agents/[taskId]/stream` — SSE endpoint using Next.js `ReadableStream`. Polls DAL every 2 seconds and pushes task JSON. Auto-closes on terminal status (`completed`, `failed`, `cancelled`).

**Remaining**:
- :x: Create a React `useSSE(url)` hook.
- :x: Update `useTaskStatus` to prefer SSE when available, falling back to polling.

### Task 9.2: Implement SSE for Dashboard Activity Feed :x:

**Status**: **Not started.**

---

## 10. Settings & Onboarding

### Task 10.1: Add Work History to Settings Page :white_check_mark:

**File**: `src/app/settings/page.tsx`

**Status**: **Complete.** Added tabbed layout (System Status / Work History). Work History tab fetches from `/api/history` with pagination. Displays action type, repo, status, duration, and error messages.

### Task 10.2: Enhance Settings Health Checks :x:

**File**: `src/app/settings/page.tsx`

**Status**: **Not started.**

**Remaining**:
- Show database connection status.
- Show TaskRunner status (queued/running/completed counts).
- Add "Test Copilot SDK Connection" button.

---

## 11. Testing & Quality

### Task 11.1: Unit Tests for New Services :x:

**Status**: **Not started.** Existing `agent-store.test.ts` updated for async/await, but no new test files created.

### Task 11.2: Integration Tests for Background Operations :x:

**Status**: **Not started.**

### Task 11.3: Frontend Component Tests :x:

**Status**: **Not started.**

### Task 11.4: End-to-End Smoke Tests :x:

**Status**: **Not started.**

---

## Dependency Graph

```
Task 1.1 (Database Schema) ✅
  └── Task 1.2 (DAL) ✅
       ├── Task 1.3 (Work Tracker) ✅
       │    └── Task 2.3 (History API) ✅
       │         ├── Task 4.1 (Dashboard Stats) ✅
       │         └── Task 10.1 (Settings History) ✅
       ├── Task 2.1 (Migrate Agent Store) ✅
       ├── Task 2.2 (Migrate Report Store) ✅
       └── Task 3.1 (Task Runner) ✅
            ├── Task 3.2 (Agents Background) ✅ → Task 5.2 ✅, 5.3 ✅, 5.4 ❌
            ├── Task 3.3 (Reviews Background) 🔶 → Task 6.5 🔶
            ├── Task 3.4 (Audit Background) 🔶
            ├── Task 3.5 (Scaffold Background) ❌ → Task 7.3 ❌
            └── Task 3.6 (Polling Hook) ✅
                 ├── Task 4.2 (Activity Feed) ✅
                 ├── Task 4.3 (Health Panel) ✅
                 ├── Task 4.4 (Onboarding) ✅
                 ├── Task 5.1 (Agent Types) ✅
                 ├── Task 6.1 (Review Form KB) ❌
                 ├── Task 6.2 (Create Issue) ✅
                 ├── Task 6.3 (Apply Fix) ✅
                 ├── Task 6.4 (Review History) ✅
                 ├── Task 7.1 (Scaffold Plan) ✅
                 ├── Task 7.2 (Guided Form) ❌
                 ├── Task 7.4 (Scaffold History) 🔶
                 ├── Task 8.1 (KB Doc Metadata) ✅
                 ├── Task 8.2 (KB Preview) ✅
                 └── Task 8.3 (KB Health) ❌

Task 9.1 (SSE Task Stream) ✅
Task 9.2 (SSE Dashboard) ❌
Task 10.2 (Enhanced Health) ❌
Task 11.* (Testing) — ❌ not started
```

---

## Execution Order (Recommended)

| Phase | Tasks | Status |
|-------|-------|--------|
| **Phase 1: Foundation** | 1.1 → 1.2 → 1.3 | :white_check_mark: **Complete** |
| **Phase 2: Migration** | 2.1, 2.2, 2.3 | :white_check_mark: **Complete** |
| **Phase 3: Background System** | 3.1 → 3.2, 3.3, 3.4, 3.5, 3.6 | :large_orange_diamond: 3.1, 3.2, 3.6 done. 3.3, 3.4 partial. 3.5 not started. |
| **Phase 4: Dashboard** | 4.1, 4.2, 4.3, 4.4 | :white_check_mark: **Complete** |
| **Phase 5: Agents** | 5.1, 5.2, 5.3, 5.4 | :large_orange_diamond: 5.1–5.3 done. 5.4 not started. |
| **Phase 6: Reviews** | 6.1, 6.2, 6.3, 6.4, 6.5 | :large_orange_diamond: 6.2–6.4 done. 6.1 not started. 6.5 partial. |
| **Phase 7: Scaffolding** | 7.1, 7.2, 7.3, 7.4 | :large_orange_diamond: 7.1 done. 7.4 partial. 7.2, 7.3 not started. |
| **Phase 8: Knowledge Base** | 8.1, 8.2, 8.3 | :large_orange_diamond: 8.1, 8.2 done. 8.3 not started. |
| **Phase 9: Settings** | 10.1, 10.2 | :large_orange_diamond: 10.1 done. 10.2 not started. |
| **Phase 10: Real-Time** | 9.1, 9.2 | :large_orange_diamond: 9.1 done. 9.2 not started. |
| **Phase 11: Testing** | 11.1, 11.2, 11.3, 11.4 | :x: **Not started** |

---

## Summary of Remaining Work

### High Priority (Functionality Gaps)
- **Task 3.3**: Make `/api/reviews/start` fully async (background task + HTTP 202)
- **Task 3.4**: Make `/api/reviews/audit` fully async (background task + HTTP 202)
- **Task 3.5**: Make `/api/scaffold/plan` and `/api/scaffold/create` async
- **Task 5.4**: Store agent results as `.repo-ninja/reports/{taskId}.md` in target repo
- **Task 6.1**: Replace `REVIEW_TYPES` with dynamic KB data
- **Task 7.2**: Replace guided form `OPTIONS` with dynamic KB data

### Medium Priority (Polish & UX)
- **Task 6.5**: Wire `useTaskStatus` hook for review progress polling
- **Task 7.3**: Add scaffold progress tracking UI
- **Task 7.4**: Wire scaffold page to save/load plans from DB
- **Task 8.3**: Add KB index health check endpoint and warning banner
- **Task 9.2**: SSE endpoint for dashboard activity feed
- **Task 10.2**: Enhanced health checks (DB status, TaskRunner stats, Copilot test)

### Lower Priority (Quality)
- **Task 11.1–11.4**: Full test suite (unit, integration, component, E2E)
- **Task 1.1 step 5**: Docker compose volume for database
- **Task 1.1 step 4**: Zod validation for DATABASE_URL

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
9. **ORM** — all database access uses Prisma ORM (`prisma/schema.prisma`). No raw SQL.
