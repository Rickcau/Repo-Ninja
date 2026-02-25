# Repo-Ninja UX/UI Review & Improvement Plan

**Date:** February 25, 2026
**Prepared for:** Repo-Ninja Development Team
**Document Type:** UX Audit, Gap Analysis & Wireframe Recommendations

---

## Executive Summary

Repo-Ninja aims to be a **single command center** where enterprise teams delegate AI-grounded development work — scaffolding, issue solving, code review — with output that follows their organization's conventions. After reviewing all five screens (Dashboard, Scaffold, Agents, Reviews, Knowledge Base) against the problem statement and solution goal, this document identifies critical gaps, missing features, and UX improvements needed to fulfill the product vision.

The current UI establishes a solid dark-theme foundation with clear navigation, but it falls short of the "unified command center" promise in several key areas: there is no persistent repository context, agent transparency is minimal, the knowledge base feels disconnected from agent actions, and the dashboard lacks the real-time operational awareness an agent orchestration platform demands.

---

## Table of Contents

1. [What Is Missing](#1-what-is-missing)
2. [Suggested Improvements](#2-suggested-improvements)
3. [Wireframes & Diagrams](#3-wireframes--diagrams)
4. [Design Token Recommendations](#4-design-token-recommendations)
5. [Priority Matrix](#5-priority-matrix)

---

## 1. What Is Missing

### 1.1 Global Repository Context Selector (Affects: ALL Pages)

**Problem:** Every action in Repo-Ninja — scaffolding, reviews, agent tasks — targets a specific repository. Currently, the repository selection is handled differently on each page: the Agents page has a dropdown, the Reviews page has a text input for `owner/repo`, and the Scaffold page has no repo selector at all. This forces the user to re-specify context on every page and creates inconsistency.

**What's needed:**
- A **persistent global repo selector** in the top header bar (or sidebar header) that sets the active repository context across all pages
- The selected repo should be visible at all times so the user always knows which repo they're operating against
- A recent/pinned repos list for fast switching
- The repo selector should pull from the user's connected GitHub account (already authenticated via "Connected as Rickcau")

**Where it goes:** Top navigation bar, between the "Dashboard" page title and the utility icons (clock, bell, theme toggle, settings, logout), OR at the top of the sidebar beneath the search bar.

---

### 1.2 Agent Transparency & Live Status (Affects: Dashboard, Agents Page)

**Problem:** The solution goal states that Repo-Ninja "orchestrates AI agents for common development tasks." The current Dashboard shows static counters (Active Agents: 0, Completed Tasks: 0) but provides no mechanism to see *what agents are doing* in real time. The "Recent Agent Activity" section is an empty state with no indication of what populated state would look like. The Agents page only shows "Select Repository" and "Recent Agent Tasks" — there is no way to see an agent's progress, logs, decision trail, or which knowledge base documents it consulted.

**What's needed:**
- **Live agent status feed** on the Dashboard showing: agent name/type, current step, target repo, elapsed time, and a progress indicator
- **Agent detail view** (accessible from both Dashboard and Agents page) showing: step-by-step execution log, which knowledge base documents were retrieved from ChromaDB, decisions made, files created/modified, and a diff preview
- **Agent controls** — ability to pause, cancel, or re-run an agent task
- **Confidence/grounding indicator** showing that the agent's output was informed by specific knowledge base documents (this directly supports the value proposition that "the AI does not hallucinate generic advice — it applies your team's actual standards")

**Where it goes:**
- Dashboard: Replace the current static "Recent Agent Activity" card with a live activity feed/timeline
- Agents page: Add an expandable task detail panel or slide-out drawer when clicking on an active/completed task

---

### 1.3 Knowledge Base ↔ Agent Linkage (Affects: Knowledge Base, Agents, Reviews, Scaffold)

**Problem:** The Knowledge Base page shows documents and their categories, and there's a ChromaDB status bar at the bottom. However, there is zero indication of *how these documents connect to agent behavior*. The user cannot see which documents an agent will use for a given task, whether the index is stale, or which documents were actually consulted during a review or scaffold operation. This is the core differentiator of Repo-Ninja and it is entirely invisible in the current UI.

**What's needed:**
- **"Used by" indicators** on each knowledge base document showing which agent types reference it (e.g., "Used by: Code Review Agent, Scaffold Agent")
- **Grounding preview** during agent task setup — when configuring a review or scaffold, show which knowledge base documents will be consulted
- **Post-task attribution** — in review results and scaffold output, link back to the specific knowledge base documents that informed the output
- **Index health indicator** — show when documents were last indexed, if any documents are out of sync, and chunk count per document (not just total)
- **Search within knowledge base** — ability to search document contents, not just filter by category

**Where it goes:**
- Knowledge Base page: Add a "Used by" column or tag set on each document row; add per-document chunk counts; add a search bar
- Reviews results page (currently missing entirely): Include "Grounded in:" citations
- Scaffold output page (currently missing): Include "Based on:" template references
- Agent task detail view: Show retrieved documents/chunks

---

### 1.4 Results/Output Pages (Affects: Reviews, Scaffold, Agents)

**Problem:** The current UI shows forms for *initiating* tasks (start a review, generate a scaffold plan, assign an agent) but there are no visible screens for *viewing results*. Where does a code review output appear? Where does a scaffold plan render? Where do agent task results show up? The user journey dead-ends at the "Start" button.

**What's needed:**
- **Code Review Results page** — showing findings organized by severity (critical, warning, info), file location, specific code snippets, and recommendations. Each finding should cite the knowledge base document that informed it.
- **Scaffold Plan Results page** — showing the proposed directory structure, file list, key configurations, and a preview. Should include an "Apply to GitHub" action.
- **Agent Task Results page** — showing the PR/commit created, files changed, issue resolution summary, and the agent's reasoning trail.
- **History/Archive** — ability to view past review results, scaffold outputs, and agent completions. Currently "Recent Agent Tasks" exists but there's no equivalent for reviews or scaffolds.

**Where it goes:**
- Reviews page: After clicking "Start Review", results should render inline or in a new sub-page accessible from a Reviews History section
- Scaffold page: After "Generate Scaffold Plan", the plan should render below the form with approve/reject/edit actions
- Agents page: Task results should be accessible from the "Recent Agent Tasks" list
- Dashboard: The "Recent Agent Activity" feed should link to each result

---

### 1.5 Onboarding & Empty States (Affects: Dashboard, Agents)

**Problem:** When a new user arrives at the Dashboard with all zeroes, the experience is cold. The empty state message "No agent tasks yet. Start one from the Agents page." provides minimal guidance. There is no onboarding flow, no setup wizard, and no indication of what the user should do first (connect GitHub → add knowledge base docs → index them → start using agents).

**What's needed:**
- **First-run onboarding checklist** on the Dashboard: "1. Connect GitHub ✓  2. Add Knowledge Base Documents  3. Index Documents in ChromaDB  4. Run Your First Code Review  5. Scaffold Your First Repo"
- **Contextual empty states** with illustrations and action buttons on each page
- **Tooltip/guided tour** option for first-time users

**Where it goes:** Dashboard (primary), and contextual empty states on every page.

---

### 1.6 Notifications & Real-Time Feedback (Affects: All Pages)

**Problem:** The top bar has a bell icon (notifications), but there is no notification system visible. When an agent finishes a task, when a review is complete, or when a scaffold plan is ready — how does the user know? There is no toast system, no notification drawer, and no indication of what the bell icon does.

**What's needed:**
- **Notification drawer** accessible from the bell icon showing: completed tasks, failed tasks, review results ready, index operations complete
- **Toast notifications** for real-time feedback (task started, task completed, errors)
- **Badge counts** on the bell icon and on sidebar nav items (e.g., "Agents" showing a count of active tasks)

**Where it goes:** Top bar notification bell (drawer), plus toast overlay on all pages.

---

### 1.7 Settings & Configuration Page (Affects: Top Bar Settings Icon)

**Problem:** The settings gear icon exists in the top bar, but there is no settings page shown. For an enterprise tool, configuration is critical.

**What's needed:**
- **GitHub connection management** — view connected account, re-auth, manage permissions
- **AI/LLM configuration** — model selection, token limits, rate limiting preferences
- **ChromaDB connection settings** — host, collection management
- **Team/organization settings** — if multi-user, manage team members and roles
- **Default review types and agent behaviors** — pre-configure defaults

**Where it goes:** New Settings page accessible from the gear icon.

---

### 1.8 Audit Trail / Activity Log (Affects: Dashboard, New Page)

**Problem:** The problem statement mentions enterprise teams. Enterprises need auditability. There is no visible audit log showing who did what, when, and against which repository.

**What's needed:**
- **Activity log page** showing timestamped entries: "Rickcau started a Security Review on owner/repo", "Code Review Agent completed — 3 critical findings", "Knowledge base document security.md updated"
- Filterable by user, action type, repository, and date range

**Where it goes:** New "Activity" page in the sidebar under FEATURES, or accessible from the clock icon in the top bar.

---

## 2. Suggested Improvements

### 2.1 Dashboard Layout Redesign

**Current issue:** The Dashboard uses a lot of vertical space inefficiently. The four stat cards, three action buttons, and the activity feed leave most of the screen empty. The stat cards show "Vs last month" but there's no sparkline or trend data — just zeroes.

**Improvement:**
- Add **sparkline mini-charts** inside each stat card to show trends over time (last 7 days or 30 days)
- Make stat cards **clickable** — clicking "Active Agents" should navigate to the Agents page filtered to active tasks
- Replace the three standalone action buttons ("Scaffold New Repo", "Start Code Review", "Run Audit") with a **quick-action command bar** or keep them but add the global repo context so they work directly from the Dashboard
- Add a **second row of content** below the activity feed: a "Knowledge Base Health" summary card (documents count, last indexed, sync status) and a "Recent Reviews" summary card
- Consider a **two-column layout** for the bottom section: activity feed on the left, quick stats/health on the right

---

### 2.2 Sidebar Navigation Improvements

**Current issue:** The sidebar has two groups (MENU: Dashboard, Scaffold, Agents | FEATURES: Reviews, Knowledge Base). The grouping is unclear — why is "Scaffold" a menu item but "Reviews" is a feature? Both are actions the user takes.

**Improvement:**
- Restructure into: **OVERVIEW** (Dashboard) | **ACTIONS** (Scaffold, Reviews, Agents) | **CONFIGURATION** (Knowledge Base, Settings)
- Add **badge counts** to nav items (e.g., Agents: 2 active, Reviews: 1 in progress)
- Add a **collapsible repo context section** at the top of the sidebar showing the currently active repo with a change button
- Add an **Activity/History** link

---

### 2.3 Reviews Page — Better Repo Input

**Current issue:** The Reviews page uses a plain text input for "Repository (owner/repo)" with placeholder text. This is error-prone and provides no validation or auto-complete.

**Improvement:**
- Replace with a **searchable dropdown** that pulls from the user's GitHub repos
- If a global repo context is set (see 1.1), pre-fill this field but allow override
- Add repo validation — show a green checkmark when the repo is valid and accessible
- Show the repo's language, last commit date, and star count as context

---

### 2.4 Reviews Page — Review Type UX

**Current issue:** Review types (Security, Performance, Accessibility, General) are simple checkboxes. The "Scope" section uses three card-style options. The visual hierarchy makes the scope selection feel more important than the review type, but arguably the review type is equally important.

**Improvement:**
- Give review types **richer cards** with descriptions (e.g., "Security — Checks for vulnerabilities, dependency issues, and authentication flaws based on your security.md knowledge base document")
- Show which **knowledge base documents** will be used for each selected review type
- Allow **multi-select with visual feedback** (highlighted state instead of small checkboxes)

---

### 2.5 Scaffold Page — Show What's Happening

**Current issue:** The Scaffold page has a text area and a "Generate Scaffold Plan" button. After clicking, there's no indication of what happens next — no loading state, no progress, no output area.

**Improvement:**
- Add a **generation progress indicator** (streaming dots, step indicators)
- Show the **generated plan** in a structured preview below the input: directory tree, file list, key dependencies, and the knowledge base templates used
- Add **approve/edit/reject actions** on the plan before it's applied
- For "Guided" mode (which exists as a tab but isn't shown), provide a step-by-step wizard: stack → features → auth → database → styling → review plan

---

### 2.6 Agents Page — Richer Task Management

**Current issue:** The Agents page is sparse — just a repo dropdown and an empty task list. There's no way to see what types of agents are available, configure them, or understand their capabilities.

**Improvement:**
- Add an **agent type selector** after repo selection: "Issue Solver", "Code Writer", "Custom Task"
- Show **agent cards** that describe each agent type and which knowledge base documents they use
- Add a **task configuration form** appropriate to the selected agent type (e.g., Issue Solver: select from open issues; Code Writer: describe the code to write)
- Show **real-time task progress** with a step-by-step execution timeline
- Add ability to **view logs/output** for each task

---

### 2.7 Knowledge Base — Content Preview & Better Management

**Current issue:** The Knowledge Base table shows file names, categories, dates, and edit/delete actions. There's no way to preview content without editing, no search, and no indication of how documents relate to agents.

**Improvement:**
- Add a **content preview panel** (click a row to see a read-only preview in a side panel or expandable row)
- Add a **search bar** to search across document contents (leveraging ChromaDB)
- Add a **"Used by"** column or tags showing which agent types reference each document
- Show **per-document chunk count** (currently only shows total: "0 chunks indexed")
- Add **drag-and-drop reordering** or priority indicators
- Add **bulk actions** (select multiple → delete, re-index, change category)
- Consider adding **version history** for documents

---

### 2.8 Consistent Action Feedback & Loading States

**Current issue:** There are no visible loading states, progress indicators, or success/error feedback anywhere in the UI.

**Improvement:**
- Add **skeleton loading states** for all data-fetching views
- Add **progress indicators** for long-running operations (reviews, scaffolding, agent tasks)
- Add **toast notifications** for success/error states
- Add **optimistic UI updates** where appropriate

---

### 2.9 Accessibility Improvements

**Current issue:** The dark theme with lime-green (#CAFF33 approximate) accent on dark navy has potential contrast issues. Checkbox visibility on the Reviews page appears low-contrast.

**Improvement:**
- Audit all color combinations for **WCAG 2.1 AA compliance** (4.5:1 contrast ratio for text)
- Ensure all interactive elements have **visible focus states**
- Add **aria-labels** to icon-only buttons (top bar icons currently have no visible labels)
- Ensure the sidebar collapse/expand is keyboard-accessible

---

### 2.10 Mobile Responsiveness

**Current issue:** The sidebar navigation pattern suggests a desktop-first design. No mobile or tablet views are shown.

**Improvement:**
- Ensure the sidebar collapses to a **hamburger menu** on smaller screens
- Stack the Dashboard stat cards vertically on mobile
- Ensure forms (Review, Scaffold) are fully usable on tablet

---

## 3. Wireframes & Diagrams

### 3.1 Improved Dashboard Layout

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  [N] Repo-Ninja    «    │    Dashboard              [owner/repo ▼]  🔔(3) ⚙ 👤   │
├─────────────────────────┼─────────────────────────────────────────────────────────┤
│  Search...              │                                                         │
│                         │  Connected as Rickcau                                   │
│  ── OVERVIEW ──         │                                                         │
│  - Dashboard            │  ┌───────── ─┐ ┌────────── ┐ ┌──────────┐ ┌──────────┐  │
│                         │  │ Active   3│ │Complete 12│ │ Total  15│ │ KB Docs  │  │
│  ── ACTIONS ──          │  │ Agents    │ │ Tasks     │ │ Tasks    │ │    11    │  │
│  - Scaffold             │  │  ╱‾‾╲     │ │    ╱‾╲    │ │  ╱‾‾‾╲   │ │  Synced  │  │
│  - Agents          (3)  │  │ ╱     ‾‾╲ │ │ ╱‾   ‾╲   │ │╱‾     ‾╲ │ │ 142 chks │  │
│  - Reviews         (1)  │  │ +2 ▲      │ │ +5 ▲      │ │ +7 ▲     │ │ ● OK     │  │
│                         │  └───────── ─┘ └────────── ┘ └──────────┘ └──────────┘  │
│  ── CONFIGURE ──        │                                                         │
│  - Knowledge Base       │  [- Scaffold New Repo ] [ - Start Review ] [ Run Audit ]│
│  - Activity             │                                                         │
│  - Settings             │  ┌─────────────────────────────┬───────────────────────┐│
│                         │  │  Live Agent Activity         │  System Health       ││
│                         │  │                              │                      ││
│                         │  │  - Code Review Agent         │  ChromaDB   * OK     ││
│                         │  │     owner/repo • Step 3/5    │  142 chunks indexed  ││
│                         │  │     Analyzing security.md... │                      ││
│                         │  │     ━━━━━━━━━  60%           │  GitHub     * OK     ││
│                         │  │     2m 34s elapsed           │  Rate: 4,200/5,000   ││
│                         │  │                              │                      ││
│                         │  │  - Issue Solver Agent       │  Last Index           ││
│                         │  │     owner/other • Step 1/3   │  2 hours ago         ││
│                         │  │     Reading issue #42...     │                      ││
│                         │  │     ━━░░░░░░░░░░  15%        │  ────────────────────││
│                         │  │     0m 12s elapsed           │  Recent Reviews      ││
│                         │  │                              │                      ││
│                         │  │  * Scaffold Agent            │  * owner/repo        ││
│                         │  │     team/new-app • Complete   │    General • 3 crit ││
│                         │  │     Created PR #7            │  * team/api          ││
│                         │  │     5m 12s • 14 files        │     Security • 0 crit││
│                         │  │                              │                      ││
│                         │  └─────────────────────────────┴───────────────────────┘│
└─────────────────────────┴─────────────────────────────────────────────────────────┘
```

**Key changes from current:**
- Global repo selector in the top bar
- Sparklines in stat cards with trend indicators
- Restructured sidebar with badge counts
- Two-column bottom layout: live agent feed (left) + system health & recent reviews (right)
- Agent activity shows real-time progress with steps, percentages, and elapsed time
- System health panel shows ChromaDB status, GitHub API rate, and recent reviews

---

### 3.2 Global Repository Context Selector (Top Bar Detail)

```
Current Top Bar:
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard                              🕐  🔔  🌙  ⚙  ➡      │
└──────────────────────────────────────────────────────────────── ─┘

Proposed Top Bar:
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard          ┌─────────────────────────┐  🔔(3) 🌙  ⚙ 👤│
│                     │  [] owner/repo-name  ▼  │                  │
│                     └─────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘

Dropdown Expanded:
┌───────────────────────────────────────────────────────────────────┐
│  Dashboard          ┌─────────────────────────┐  🔔(3) 🌙  ⚙  👤│
│                     │  [] owner/repo-name  ▼  │                   │
│                     ├─────────────────────────┤                   │
│                     │  * Search repos...      │                   │
│                     │                         │                   │
│                     │  PINNED                 │                   │
│                     │  * owner/main-app       │                   │
│                     │  * owner/api-service    │                   │
│                     │                         │                   │
│                     │  RECENT                 │                   │
│                     │  [] owner/repo-name     │                   │
│                     │  [] team/frontend       │                   │
│                     │  [] team/backend        │                   │
│                     │                         │                   │
│                     │  All Repositories →     │                   │
│                     └─────────────────────────┘                   │
└───────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Agent Task Detail View (Slide-Out Panel)

```
┌─── Agents Page ──────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  Agent Management                                                                │
│  Active repo: owner/repo-name                                                    │
│                                                                                  │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  Agent Type                     │  │  TASK DETAIL                    [X]  │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐  │  │                                      │   │
│  │  │ Issue │ │ Code  │ │Custom │  │  │  Issue Solver — Issue #42            │   │
│  │  │Solver │ │Writer │ │ Task  │  │  │  owner/repo-name                     │   │
│  │  │  *    │ │       │ │       │  │  │  Status:In Progress || Pause  X Stop │   │
│  │  └───────┘ └───────┘ └───────┘  │  │                                      │   │
│  │                                 │  │  ── Execution Timeline ──            │   │
│  │  Select Issue:                  │  │                                      │   │
│  │  ┌─────────────────────────┐    │  │  [X] Step 1: Read issue              │   │
│  │  │ #42 Fix login bug    ▼  │    │  │      Parsed issue description        │   │
│  │  └─────────────────────────┘    │  │      0.3s                            │   │
│  │                                 │  │                                      │   │
│  │  [ Start Agent ]                │  │  [X] Step 2: Query knowledge base    │   │
│  │                                 │  │      Retrieved: security.md (3 chks) │   │
│  │  ── Recent Agent Tasks ──       │  │      Retrieved: typescript.md (1 chk)│   │
│  │                                 │  │      1.2s                            │   │
│  │  * Issue #42 • In Progress      │  │                                      │   │
│  │  *  Issue #38 • Complete        │  │  * Step 3: Generate solution         │   │
│  │  * Issue #35 • Complete         │  │     Writing auth/login.ts...         │   │
│  │  X Issue #30 • Failed           │  │     ━━━━━━━━░░░  65%                 │   │
│  │                                 │  │                                      │   │
│  │                                 │  │  - Step 4: Create PR                 │   │
│  │                                 │  │  - Step 5: Run tests                 │   │
│  │                                 │  │                                      │   │
│  │                                 │  │  ── Grounded In ──                   │   │
│  │                                 │  │  - security.md — Auth patterns       │   │
│  │                                 │  │  - typescript.md — Type safety       │   │
│  │                                 │  │                                      │   │
│  └─────────────────────────────────┘  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Agent type cards for quick selection
- Issue selector (pre-populated from GitHub)
- Side panel showing real-time execution timeline
- "Grounded In" section showing which knowledge base documents were consulted
- Task history with status indicators

---

### 3.4 Code Review Results Page

```
┌─── Reviews ──────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  Code Review Results                                                             │
│  owner/repo-name • Security + General • Full Repository                          │
│  Completed 3m 22s ago                                                            │
│                                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                             │
│  │* Critical│ │* Warning │ │ * Info   │ │ Score    │                             │
│  │     3    │ │     7    │ │    12    │ │  72/100  │                             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                             │
│                                                                                  │
│  ── Findings ──                                 Filter: [All ▼] [All Files ▼]    │
│                                                                                  │
│  * CRITICAL — SQL Injection Risk                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │  [] src/api/users.ts  Line 42                                             │   │
│  │                                                                           │   │
│  │  ```                                                                      │   │
│  │  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;         │   │
│  │  ```                                                                      │   │
│  │                                                                           │   │
│  │  ! User input is directly interpolated into SQL query without             │   │
│  │    parameterization. Use prepared statements.                             │   │
│  │                                                                           │   │
│  │  = Grounded in: security.md → "Always use parameterized queries..."       │   │
│  │                                                                           │   │
│  │  ! Suggested fix:                                                         │   │
│  │  ```                                                                      │   │
│  │  const query = `SELECT * FROM users WHERE id = $1`;                       │   │
│  │  const result = await db.query(query, [req.params.id]);                   │   │
│  │  ```                                                                      │   │
│  │                                                                           │   │
│  │  [ Create Issue ] [ Apply Fix ] [ Dismiss ]                               │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ! WARNING — Missing Error Boundary                                              │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │  [] src/components/App.tsx  Line 15                                       │   │
│  │  ...                                                                      │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Summary stat cards at top (critical, warning, info counts + overall score)
- Each finding shows file, line, code snippet, explanation, and knowledge base citation
- Actionable buttons per finding: create GitHub issue, apply suggested fix, dismiss
- Filter controls for severity and file path

---

### 3.5 Scaffold Plan Results View

```
┌─── Scaffold ─────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  Scaffold New Repo                                                               │
│                                                                                  │
│  [Natural Language]  [Guided]                                                    │
│                                                                                  │
│  [X] Plan Generated — Based on: react-nextjs-fullstack.md, security.md           │
│                                                                                  │
│  ┌──────────────────────────────────┬────────────────────────────────────────┐   │
│  │  [] Project Structure            │  [] File Preview                       │   │
│  │                                  │                                        │   │
│  │  my-nextjs-app/                  │  ── package.json ──                    │   │
│  │  ├── src/                        │                                        │   │
│  │  │   ├── app/                    │  {                                     │   │
│  │  │   │   ├── layout.tsx          │    "name": "my-nextjs-app",            │   │
│  │  │   │   ├── page.tsx            │    "version": "1.0.0",                 │   │
│  │  │   │   └── api/                │    "dependencies": {                   │   │
│  │  │   │       └── auth/           │      "next": "^14.0.0",                │   │
│  │  │   │           └── route.ts    │      "react": "^18.2.0",               │   │
│  │  │   ├── components/             │      "@auth/nextjs": "^1.0.0",         │   │
│  │  │   ├── lib/                    │      "prisma": "^5.0.0"                │   │
│  │  │   └── styles/                 │    }                                   │   │
│  │  ├── prisma/                     │  }                                     │   │
│  │  │   └── schema.prisma           │                                        │   │
│  │  ├── tests/                      │                                        │   │
│  │  ├── .env.example                │                                        │   │
│  │  ├── .eslintrc.json              │                                        │   │
│  │  ├── tailwind.config.ts          │                                        │   │
│  │  ├── tsconfig.json               │                                        │   │
│  │  └── package.json                │                                        │   │
│  │                                  │                                        │   │
│  │  14 files • 3 directories        │                                        │   │
│  └──────────────────────────────────┴────────────────────────────────────────┘   │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │  = Grounded In:                                                           │   │
│  │  • react-nextjs-fullstack.md — Project structure, routing patterns        │   │
│  │  • security.md — OAuth setup, env variable handling                       │   │
│  │  • typescript.md — Strict mode config, type patterns                      │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [ * Regenerate ]  [ - Edit Plan ]  [ [X] Create Repository on GitHub ]          │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- File tree on the left, file preview on the right
- "Grounded In" section showing which knowledge base templates were used
- Action buttons: regenerate, edit, or apply to GitHub

---

### 3.6 Knowledge Base — Improved Layout

```
┌─── Knowledge Base ───────────────────────────────────────────────────────────────┐
│                                                                                  │
│  Knowledge Base                                                      [+ Add Doc] │
│  Manage documents that power AI agents and code reviews.                         │
│                                                                                  │
│  * Search document contents...          [All Categories v]  [All Agents v]       │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │ Name                 │ Category         │ Used By          │ Chunks │ [T] │   │
│  ├──────────────────────┼──────────────────┼──────────────────┼────────┼─────┤   │
│  │ react-nextjs.md      │ Best Practices   │ Review, Scaffold │   23   │ ✏🗑 │   │
│  │ security.md          │ Best Practices   │ Review, Agent    │   18   │ ✏🗑 │   │
│  │ typescript.md        │ Best Practices   │ Review, Scaffold │   15   │ ✏🗑 │   │
│  │ react-nextjs-full... │ Scaffolding      │ Scaffold         │   31   │ ✏🗑 │   │
│  │ general-review.md    │ Review Instruct. │ Review           │   12   │ ✏🗑 │   │
│  │ security-review.md   │ Review Instruct. │ Review           │    9   │ ✏🗑 │   │
│  │ code-writer.md       │ Agent Instruct.  │ Agent            │   14   │ ✏🗑 │   │
│  │ issue-solver.md      │ Agent Instruct.  │ Agent            │   11   │ ✏🗑 │   │
│  │ github-actions.md    │ CI/CD            │ Scaffold         │    7   │ ✏🗑 │   │
│  │ rai-checklist.md     │ Responsible AI   │ Review, Audit    │    2   │ ✏🗑 │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ChromaDB: [X] Connected  (142 chunks indexed)  Last indexed: 2h ago             │
│  [ * Re-index All ]  [ * Index Health ]                                          │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Key changes from current:**
- Added search bar for searching within document contents
- Added "Used By" column showing which agent types reference each document
- Added "Chunks" column showing per-document index count
- Added "All Agents" filter dropdown
- Enhanced ChromaDB status bar with last-indexed timestamp
- Added "Index Health" button for detailed diagnostics

---

### 3.7 First-Run Onboarding (Dashboard Empty State)

```
┌─── Dashboard (First Run) ────────────────────────────────────────────────────────┐
│                                                                                  │
│  Welcome to Repo-Ninja, Rickcau!                                                 │
│  Let's get your AI-powered development command center set up.                    │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │  [X]  1. Connect GitHub                                                   │   │
│  │      Connected as Rickcau • 12 repos accessible                           │   │
│  │                                                                           │   │
│  │  [ ]  2. Set Up Your Knowledge Base                          [ Start -> ] │   │
│  │      Add your team's best practices, review rules, and templates          │   │
│  │                                                                           │   │
│  │  [ ]  3. Index Documents in ChromaDB                                      │   │
│  │      So agents can ground their work in your actual standards             │   │
│  │                                                                           │   │
│  │  [ ]  4. Run Your First Code Review                                       │   │
│  │      See how the AI applies your security and quality standards           │   │
│  │                                                                           │   │
│  │  [ ]  5. Scaffold a Repository                                            │   │
│  │      Generate a project from your templates and conventions               │   │
│  │                                                                           │   │
│  │  [ ]  6. Deploy Your First Agent                                          │   │
│  │      Assign an AI agent to solve a real issue in your repo                │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ! Pro tip: Start with Step 2 — the quality of your knowledge base directly      │
│     determines how well agents and reviews perform.                              │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.8 Notification Drawer

```
┌──── Notification Drawer ──────────────────────┐
│                                               │
│  Notifications                    [Clear All] │
│                                               │
│  ── Today ──                                  │
│                                               │
│  * Code Review Complete          2m ago       │
│     owner/repo • Security + General           │
│     3 critical, 7 warnings                    │
│     [ View Results → ]                        │
│                                               │
│  * Agent Task Complete           15m ago      │
│     Issue Solver → Issue #42                  │
│     Created PR #48                            │
│     [ View PR → ]                             │
│                                               │
│  ! Agent Task Failed             1h ago       │
│     Code Writer → owner/api                   │
│     Error: Rate limit exceeded                │
│     [ Retry → ]                               │
│                                               │
│  * Knowledge Base Indexed        2h ago       │
│     142 chunks from 11 documents              │
│                                               │
│  ── Yesterday ──                              │
│                                               │
│  * Scaffold Complete             ...          │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 4. Design Token Recommendations

The current UI uses a dark theme with lime-green accents. To maintain visual consistency while addressing the improvements above, here are recommended design token additions:

```
Status Colors (for agent states and findings):
- Active/In Progress:   #3B82F6 (blue)
- Success/Complete:     #22C55E (green)
- Warning:              #F59E0B (amber)
- Critical/Error:       #EF4444 (red)
- Info:                 #6366F1 (indigo)

Existing (preserve):
- Primary Accent:       #CAFF33 (lime-green) — keep for CTAs and active nav
- Background Primary:   #0B1120 (deep navy)
- Background Card:      #111827 (dark card)
- Background Elevated:  #1F2937 (elevated surface)
- Text Primary:         #F9FAFB (near-white)
- Text Secondary:       #9CA3AF (muted gray)
- Border Default:       #374151 (subtle border)

New tokens needed:
- Progress Bar Track:   #1F2937
- Progress Bar Fill:    #CAFF33 (primary) or status color
- Badge Background:     #CAFF33 with #0B1120 text
- Skeleton Shimmer:     linear-gradient(#1F2937, #374151, #1F2937)
- Toast Background:     #1F2937 with left-border status color
- Knowledge Base Tag:   category-specific muted colors
```

---

## 5. Priority Matrix

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| **P0 — Critical** | Global Repo Context Selector (1.1) | High | Medium |
| **P0 — Critical** | Agent Transparency & Live Status (1.2) | High | High |
| **P0 — Critical** | Results/Output Pages (1.4) | High | High |
| **P1 — High** | Knowledge Base ↔ Agent Linkage (1.3) | High | Medium |
| **P1 — High** | Onboarding & Empty States (1.5) | Medium | Low |
| **P1 — High** | Notifications (1.6) | Medium | Medium |
| **P2 — Medium** | Dashboard Layout Redesign (2.1) | Medium | Medium |
| **P2 — Medium** | Sidebar Restructuring (2.2) | Low | Low |
| **P2 — Medium** | Reviews Page UX Improvements (2.3, 2.4) | Medium | Low |
| **P2 — Medium** | Scaffold Results View (2.5) | Medium | Medium |
| **P2 — Medium** | Agent Task Management (2.6) | Medium | Medium |
| **P2 — Medium** | Knowledge Base Improvements (2.7) | Medium | Low |
| **P3 — Low** | Settings Page (1.7) | Low | Medium |
| **P3 — Low** | Audit Trail (1.8) | Low | Medium |
| **P3 — Low** | Accessibility Audit (2.9) | Medium | Low |
| **P3 — Low** | Mobile Responsiveness (2.10) | Low | Medium |
| **P3 — Low** | Loading States & Feedback (2.8) | Medium | Low |

---

## Summary

The current Repo-Ninja UI has a clean, professional dark-theme foundation. However, to achieve its stated goal of being a **"single command center where teams can point agents at real work and trust that the output follows their organization's conventions"**, the following three areas need the most urgent attention:

1. **Unified repository context** — The user needs to always know what repo they're targeting, across every page, without re-entering it.

2. **Agent transparency and grounding visibility** — This is Repo-Ninja's core differentiator. Users must be able to see what agents are doing, what knowledge base documents are informing their work, and how confident the output is. Without this, the platform feels like any other generic AI tool.

3. **Complete user journeys** — The current UI only shows the "start" of each workflow. Adding results pages, history views, and actionable outputs (create PR, apply fix, create issue) will transform the platform from a task launcher into a true command center.

The wireframes in Section 3 provide a concrete starting point for redesigning each screen to address these gaps.
