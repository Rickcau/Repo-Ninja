# Repo-Ninja: Full Implementation Task List

> **Purpose**: This document serves as an agentic task list for systematically implementing all mocked, stubbed, and missing features in the Repo-Ninja frontend and backend. Each task is broken into discrete, actionable steps designed to be executed by an AI agent or developer. All AI-powered features **must** use the GitHub Copilot SDK (`@github/copilot-sdk`).

> **Last Updated**: 2026-02-28 — All high-priority and medium-priority tasks completed. Tests added.

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
1. ~~Choose and install a database client.~~ :white_check_mark: Prisma 7 with `@prisma/adapter-better-sqlite3`.
2. ~~Create schema with all tables.~~ :white_check_mark: `prisma/schema.prisma`
3. ~~Create database initialization script.~~ :white_check_mark: Prisma handles this via `prisma migrate dev` and `postinstall` script.
4. ~~Add `DATABASE_URL` entry.~~ :large_orange_diamond: `DATABASE_URL` is in `.env` (default `file:./dev.db`). Zod validation not added.
5. :x: Update `docker-compose.yml` to mount a volume for the database file.
6. :x: Write unit tests for the schema and migration.

### Task 1.2: Create Data Access Layer (DAL) :white_check_mark:

**Status**: **Complete.** `src/lib/db/dal.ts` — full DAL using Prisma Client with type-safe queries. All CRUD operations, pagination, filtering.

### Task 1.3: Create Work History Tracking Service :white_check_mark:

**Status**: **Complete.** Work tracking functions (`logWorkStart`, `logWorkComplete`, `logWorkFailure`) are in the DAL and integrated into all API routes.

---

## 2. Persistent Data Store & Work Tracking

### Task 2.1: Migrate Agent Store from File-Based to Database :white_check_mark:

**Status**: **Complete.** `src/lib/agent-store.ts` now delegates to async DAL functions.

### Task 2.2: Migrate Review Report Store from In-Memory to Database :white_check_mark:

**Status**: **Complete.** `src/app/api/reviews/report-store.ts` now delegates to DAL.

### Task 2.3: Add Work History API Endpoints :white_check_mark:

**Status**: **Complete.** `GET /api/history` with pagination/filtering, `GET /api/history/[id]`.

---

## 3. Background Job System

### Task 3.1: Implement Background Task Runner :white_check_mark:

**Status**: **Complete.** `src/lib/services/task-runner.ts` — singleton with `enqueue()`, `cancel()`, `isCancelled()`, `getStatus()`, `getStats()`.

### Task 3.2: Refactor `/api/agents/start` to Use Background Execution :white_check_mark:

**Status**: **Complete.** Returns HTTP 202 immediately. Background execution via `taskRunner.enqueue()`. Includes cancellation checks between steps.

### Task 3.3: Refactor `/api/reviews/start` to Use Background Execution :white_check_mark:

**Status**: **Complete.** Creates reviewId, saves initial report with status "running", enqueues background work via `taskRunner.enqueue()`, returns HTTP 202 with `{ id, status: "running" }`. Background work includes cancellation checks between major steps.

### Task 3.4: Refactor `/api/reviews/audit` to Use Background Execution :white_check_mark:

**Status**: **Complete.** Same pattern as Task 3.3. Returns HTTP 202 with `{ id, status: "running" }`.

### Task 3.5: Refactor `/api/scaffold/plan` and `/api/scaffold/create` to Use Background Execution :white_check_mark:

**Status**: **Complete.**
- `/api/scaffold/plan` POST: Creates planId, saves initial plan to DB, enqueues background work, returns HTTP 202 with `{ planId, status: "generating" }`. GET endpoint polls plan status.
- `/api/scaffold/create` POST: Creates taskId, enqueues background work (create repo → generate files via Copilot → commit), returns HTTP 202 with `{ taskId, status: "creating" }`.

### Task 3.6: Create Universal Status Polling Hook :white_check_mark:

**Status**: **Complete.** `src/hooks/use-task-status.ts` — generic polling hook with auto-start, auto-stop on terminal status, configurable interval. Used by reviews and scaffold pages.

---

## 4. Dashboard — Replace All Mocked Data

### Task 4.1: Replace Dashboard Stats with Real Data :white_check_mark:

**Status**: **Complete.** Fetches from `/api/dashboard/stats`. API queries DAL for real counts.

### Task 4.2: Replace Agent Activity Feed with Real Data :white_check_mark:

**Status**: **Complete.** Fetches from `/api/agents/tasks`. 10-second auto-refresh.

### Task 4.3: Replace System Health Panel with Real Data :white_check_mark:

**Status**: **Complete.** Fetches from `/api/dashboard/health`. API checks ChromaDB, GitHub rate limit, and recent reviews.

### Task 4.4: Replace Onboarding Checklist with Real Completion Detection :white_check_mark:

**Status**: **Complete.** Fetches from `/api/dashboard/onboarding`.

---

## 5. Agent System — Full Implementation

### Task 5.1: Replace Agent Type Selector Mock Data :white_check_mark:

**Status**: **Complete.** Now fetches from `/api/agents/types` for dynamic KB document lists.

### Task 5.2: Implement Agent Task Pause/Resume/Cancel :white_check_mark:

**Status**: **Complete.** `POST /api/agents/[taskId]/cancel` endpoint. `taskRunner.isCancelled()` checked between major steps.

### Task 5.3: Implement Agent Progress Streaming :white_check_mark:

**Status**: **Complete.** SSE endpoint at `GET /api/agents/[taskId]/stream`.

### Task 5.4: Store Agent Results to Repository :white_check_mark:

**Status**: **Complete.** After successful agent task, commits `.repo-ninja/reports/{taskId}.md` to the target branch. Report includes task summary, files modified, KB documents used, PR link, and timestamps. Report path stored in `AgentTaskResult.reportPath`.

---

## 6. Code Reviews — End-to-End

### Task 6.1: Replace Review Form KB Data with Real Data :white_check_mark:

**Status**: **Complete.**
- Created `GET /api/reviews/types` endpoint that queries ChromaDB for KB docs per review type.
- Updated `review-form.tsx` to fetch from `/api/reviews/types` with fallback to static data.

### Task 6.2: Implement "Create GitHub Issue" from Finding :white_check_mark:

**Status**: **Complete.** `POST /api/reviews/create-issue` endpoint created.

### Task 6.3: Implement "Apply Fix" from Finding :white_check_mark:

**Status**: **Complete.** `POST /api/reviews/apply-fix` endpoint created.

### Task 6.4: Replace Review History with Real Data :white_check_mark:

**Status**: **Complete.** Fetches from `/api/reviews/history`.

### Task 6.5: Add Review Progress Tracking to the Frontend :white_check_mark:

**Status**: **Complete.** `reviews/page.tsx` now handles the HTTP 202 response from `/api/reviews/start` and `/api/reviews/audit`. After receiving `{ id, status: "running" }`, the page polls `GET /api/reviews/{reportId}` every 3 seconds until the report reaches `completed` or `failed` status. Loading animation plays during polling.

---

## 7. Repository Scaffolding — Complete the Loop

### Task 7.1: Replace Scaffold Plan Mock with Real Copilot SDK Data :white_check_mark:

**Status**: **Complete.** Removed `MOCK_PLAN`. Uses real `plan` prop.

### Task 7.2: Replace Guided Form Hardcoded Options with Dynamic Data :white_check_mark:

**Status**: **Complete.**
- Created `GET /api/scaffold/options` endpoint that queries ChromaDB for scaffold templates and extracts options.
- Updated `guided-form.tsx` to fetch from `/api/scaffold/options` with fallback to static options.

### Task 7.3: Add Scaffold Progress Tracking :white_check_mark:

**Status**: **Complete.** `scaffold/page.tsx` now handles the HTTP 202 response from `/api/scaffold/plan`. After receiving `{ planId, status: "generating" }`, the page polls `GET /api/scaffold/plan?planId=...` every 3 seconds. Progress animation plays during polling. When completed, the plan is displayed in `ScaffoldPlanView`.

### Task 7.4: Persist Scaffold Plans :white_check_mark:

**Status**: **Complete.** DAL functions fully wired. Scaffold plans saved to DB on creation. `scaffold/create` also uses background execution — returns HTTP 202 with `{ taskId, status: "creating" }` and polls for completion.

---

## 8. Knowledge Base — Live Metadata

### Task 8.1: Replace Document List Mock Metadata :white_check_mark:

**Status**: **Complete.** Removed `MOCK_USED_BY` and `MOCK_CHUNKS`.

### Task 8.2: Replace Content Preview Mock Metadata :white_check_mark:

**Status**: **Complete.** Removed all `MOCK_*` constants.

### Task 8.3: Add Knowledge Base Index Health Check :white_check_mark:

**Status**: **Complete.**
- Created `GET /api/knowledge/health` endpoint. Checks ChromaDB connection, counts markdown files on disk vs indexed chunks, identifies out-of-sync documents.
- Updated `knowledge/page.tsx` to call the API. Replaced `alert()` with real health check UI showing healthy/unhealthy status, chunk counts, and out-of-sync document list.

---

## 9. Real-Time Updates (SSE/WebSocket)

### Task 9.1: Implement SSE Endpoint for Task Updates :white_check_mark:

**Status**: **Complete.** `GET /api/agents/[taskId]/stream` — SSE endpoint using Next.js `ReadableStream`.

**Remaining**:
- :x: Create a React `useSSE(url)` hook.
- :x: Update `useTaskStatus` to prefer SSE when available, falling back to polling.

### Task 9.2: Implement SSE for Dashboard Activity Feed :white_check_mark:

**Status**: **Complete.** `GET /api/dashboard/activity-stream` — SSE endpoint that pushes task updates every 3 seconds. Auto-closes after 5 minutes.

---

## 10. Settings & Onboarding

### Task 10.1: Add Work History to Settings Page :white_check_mark:

**Status**: **Complete.** Tabbed layout with pagination. Fetches from `/api/history`.

### Task 10.2: Enhance Settings Health Checks :white_check_mark:

**Status**: **Complete.**
- Enhanced `GET /api/health` to include Database (Prisma) connection status, record counts, and TaskRunner stats.
- Updated `settings/page.tsx` with:
  - Database (Prisma) status card showing connection state and record counts for all tables.
  - Background Tasks card showing TaskRunner stats (total, running, completed, failed, cancelled).
  - Database status in the Health Check summary card.
  - Updated Environment card with Prisma version.

---

## 11. Testing & Quality

### Task 11.1: Unit Tests for New Services :white_check_mark:

**Status**: **Complete.**
- `__tests__/lib/services/task-runner.test.ts` — 14 tests covering enqueue, complete, fail, cancel, stats, edge cases.
- `__tests__/lib/agent-store.test.ts` — updated to mock DAL layer (avoids Prisma `import.meta` issues with Jest). 14 tests.
- All 46 tests pass across 4 test suites with zero failures.

### Task 11.2: Integration Tests for Background Operations :large_orange_diamond:

**Status**: **Partially done.** TaskRunner tests cover background execution patterns. Full integration tests requiring a live DB/Prisma are blocked by Jest's lack of `import.meta` support in CommonJS mode. Would need a custom ESM jest config or a separate test runner.

### Task 11.3: Frontend Component Tests :x:

**Status**: **Not started.** Would require jest-environment-jsdom configuration for React components.

### Task 11.4: End-to-End Smoke Tests :x:

**Status**: **Not started.** Would require a running dev server.

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
            ├── Task 3.2 (Agents Background) ✅ → Task 5.2 ✅, 5.3 ✅, 5.4 ✅
            ├── Task 3.3 (Reviews Background) ✅ → Task 6.5 ✅
            ├── Task 3.4 (Audit Background) ✅
            ├── Task 3.5 (Scaffold Background) ✅ → Task 7.3 ✅
            └── Task 3.6 (Polling Hook) ✅
                 ├── Task 4.2 (Activity Feed) ✅
                 ├── Task 4.3 (Health Panel) ✅
                 ├── Task 4.4 (Onboarding) ✅
                 ├── Task 5.1 (Agent Types) ✅
                 ├── Task 6.1 (Review Form KB) ✅
                 ├── Task 6.2 (Create Issue) ✅
                 ├── Task 6.3 (Apply Fix) ✅
                 ├── Task 6.4 (Review History) ✅
                 ├── Task 7.1 (Scaffold Plan) ✅
                 ├── Task 7.2 (Guided Form) ✅
                 ├── Task 7.4 (Scaffold Persistence) ✅
                 ├── Task 8.1 (KB Doc Metadata) ✅
                 ├── Task 8.2 (KB Preview) ✅
                 └── Task 8.3 (KB Health) ✅

Task 9.1 (SSE Task Stream) ✅
Task 9.2 (SSE Dashboard) ✅
Task 10.2 (Enhanced Health) ✅
Task 11.1 (Unit Tests) ✅
Task 11.2 (Integration Tests) 🔶
Task 11.3 (Component Tests) ❌
Task 11.4 (E2E Tests) ❌
```

---

## Execution Order (Final Status)

| Phase | Tasks | Status |
|-------|-------|--------|
| **Phase 1: Foundation** | 1.1 → 1.2 → 1.3 | :white_check_mark: **Complete** |
| **Phase 2: Migration** | 2.1, 2.2, 2.3 | :white_check_mark: **Complete** |
| **Phase 3: Background System** | 3.1 → 3.2, 3.3, 3.4, 3.5, 3.6 | :white_check_mark: **Complete** |
| **Phase 4: Dashboard** | 4.1, 4.2, 4.3, 4.4 | :white_check_mark: **Complete** |
| **Phase 5: Agents** | 5.1, 5.2, 5.3, 5.4 | :white_check_mark: **Complete** |
| **Phase 6: Reviews** | 6.1, 6.2, 6.3, 6.4, 6.5 | :white_check_mark: **Complete** |
| **Phase 7: Scaffolding** | 7.1, 7.2, 7.3, 7.4 | :white_check_mark: **Complete** |
| **Phase 8: Knowledge Base** | 8.1, 8.2, 8.3 | :white_check_mark: **Complete** |
| **Phase 9: Settings** | 10.1, 10.2 | :white_check_mark: **Complete** |
| **Phase 10: Real-Time** | 9.1, 9.2 | :white_check_mark: **Complete** |
| **Phase 11: Testing** | 11.1, 11.2, 11.3, 11.4 | :large_orange_diamond: 11.1 done. 11.2 partial. 11.3, 11.4 not started. |

---

## Remaining Work (Low Priority)

These items are not blockers for testing or deployment:

### Infrastructure
- Docker compose volume for database
- Zod validation for `DATABASE_URL`
- Delete operations for DAL entities

### Testing
- **Task 11.2**: Full integration tests (blocked by Jest + Prisma `import.meta` incompatibility — needs ESM config)
- **Task 11.3**: Frontend component tests (needs jest-environment-jsdom setup)
- **Task 11.4**: E2E smoke tests (needs running dev server)

### Real-Time Polish
- `useSSE(url)` React hook for SSE → polling fallback

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
