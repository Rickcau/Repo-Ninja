# Repo-Ninja Design Document

**Date:** 2026-02-23
**Status:** Approved
**Challenge:** GitHub Copilot SDK Enterprise Challenge (Q3 FY26)
**Deadline:** Mar 7, 2026

---

## 1. Problem Statement

Enterprise developers spend significant time on repetitive setup, code review, and standards enforcement tasks. Existing tools address these individually, but there's no unified platform that lets teams delegate this work to AI agents grounded in their own best practices and standards.

## 2. Solution

Repo-Ninja is a web-based command center for delegating development work to GitHub Copilot agents, powered by a customizable knowledge base of best practices, scaffolding templates, and review instructions. Users can scaffold new repos, assign issues to agents, run code reviews, audit repos for best practices, and have agents write code — all grounded in organization-specific knowledge retrieved via semantic search.

## 3. Target Users

- Enterprise developers and tech leads who manage multiple repositories
- Teams wanting to enforce consistent standards across projects
- Organizations adopting GitHub Copilot and seeking to extend it beyond the IDE

---

## 4. Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│  ┌─────────┬──────────┬──────────┬─────────────────┐ │
│  │Scaffold │ Agents   │ Reviews  │ Knowledge Base  │ │
│  │  Panel  │  Panel   │  Panel   │    Manager      │ │
│  └────┬────┴────┬─────┴────┬─────┴───────┬─────────┘ │
└───────┼─────────┼──────────┼─────────────┼───────────┘
        │         │          │             │
┌───────▼─────────▼──────────▼─────────────▼───────────┐
│              Next.js API Routes (Server)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ /api/    │ │ /api/    │ │ /api/    │ │ /api/    │ │
│  │ scaffold │ │ agents   │ │ reviews  │ │ knowledge│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │            │            │            │       │
│  ┌────▼─────────────▼────────────▼───────────▼────┐  │
│  │         GitHub Copilot SDK (Agent Core)        │  │
│  └────┬──────────────────────────────────┬────────┘  │
│       │                                  │           │
│  ┌────▼──────┐                    ┌──────▼─────────┐ │
│  │ GitHub API│                    │ ChromaDB Client│ │
│  │ (Octokit) │                    │  (JS Client)   │ │
│  └───────────┘                    └──────┬─────────┘ │
└──────────────────────────────────────────┼───────────┘
                                           │
                                    ┌──────▼──────────┐
                                    │ ChromaDB Server │
                                    │   (Docker)      │
                                    └─────────────────┘
```

### Approach

**Monolith Next.js + ChromaDB Sidecar** — a single Next.js application handles both the UI and API routes. ChromaDB runs as a Docker sidecar container. All code is TypeScript.

**Why this approach:**
- Single codebase, fastest to develop within the 3-week challenge timeline
- Docker Compose provides one-command local setup
- Next.js API routes with SSE handle long-running agent tasks
- Clean Azure deployment path (App Service + Container Apps)

---

## 5. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14+, React 18, TypeScript | App Router, SSR, streaming |
| Styling | TailwindCSS + Shadcn UI | Accessible, themeable components |
| Auth | NextAuth.js (GitHub provider) | GitHub OAuth, session management |
| Copilot SDK | GitHub Copilot SDK | Agent orchestration |
| GitHub API | Octokit | Repo/issue/PR management |
| Vector DB | ChromaDB (Docker) + chromadb-client | Semantic search over knowledge base |
| Embeddings | OpenAI text-embedding-3-small or Copilot SDK built-in | Document + query embeddings |
| Reports | @react-pdf/renderer | Downloadable review/audit reports |
| Streaming | Server-Sent Events (SSE) | Real-time agent status updates |
| Container | Docker Compose | One-command local setup |

---

## 6. Repo Structure

```
Repo-Ninja/
├── src/                              # Working code (challenge requirement)
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Dashboard / home
│   │   ├── scaffold/
│   │   │   └── page.tsx              # Repo scaffolding UI
│   │   ├── agents/
│   │   │   └── page.tsx              # Agent management (issues, code writing)
│   │   ├── reviews/
│   │   │   └── page.tsx              # Code review & best practices reports
│   │   ├── knowledge/
│   │   │   └── page.tsx              # Manage best practices & templates
│   │   ├── settings/
│   │   │   └── page.tsx              # GitHub auth, config
│   │   ├── api/                      # Next.js API routes
│   │   │   ├── auth/[...nextauth]/   # GitHub OAuth (NextAuth.js)
│   │   │   ├── scaffold/             # Scaffolding endpoints
│   │   │   ├── agents/               # Agent orchestration endpoints
│   │   │   ├── reviews/              # Code review endpoints
│   │   │   ├── knowledge/            # Knowledge base CRUD
│   │   │   └── health/               # Health check
│   │   └── globals.css
│   ├── components/                   # React components
│   │   ├── ui/                       # Shadcn UI base components
│   │   ├── layout/                   # Header, sidebar, nav
│   │   ├── scaffold/                 # Scaffolding feature components
│   │   ├── agents/                   # Agent feature components
│   │   ├── reviews/                  # Review feature components
│   │   ├── knowledge/                # Knowledge base components
│   │   └── shared/                   # Shared components (status badges, etc.)
│   ├── lib/                          # Shared utilities
│   │   ├── copilot-sdk/              # Copilot SDK wrappers
│   │   ├── github/                   # GitHub API helpers (Octokit)
│   │   ├── chromadb/                 # ChromaDB client helpers
│   │   ├── types.ts                  # TypeScript types
│   │   └── utils.ts                  # General utilities
│   ├── hooks/                        # React hooks
│   ├── knowledge-base/               # Default knowledge content
│   │   ├── best-practices/
│   │   │   ├── react-nextjs.md
│   │   │   ├── typescript.md
│   │   │   ├── api-design.md
│   │   │   ├── testing.md
│   │   │   └── security.md
│   │   ├── scaffolding/
│   │   │   ├── react-nextjs-fullstack.md
│   │   │   ├── python-fastapi.md
│   │   │   ├── node-express.md
│   │   │   └── dotnet-webapi.md
│   │   ├── review-instructions/
│   │   │   ├── security-review.md
│   │   │   ├── performance-review.md
│   │   │   ├── accessibility-review.md
│   │   │   └── general-review.md
│   │   ├── agent-instructions/
│   │   │   ├── issue-solver.md
│   │   │   ├── code-writer.md
│   │   │   └── pr-reviewer.md
│   │   ├── architecture-patterns/
│   │   │   ├── microservices.md
│   │   │   ├── monorepo.md
│   │   │   ├── event-driven.md
│   │   │   └── serverless.md
│   │   ├── ci-cd/
│   │   │   ├── github-actions.md
│   │   │   ├── azure-devops.md
│   │   │   └── docker-deployment.md
│   │   ├── responsible-ai/
│   │   │   ├── rai-checklist.md
│   │   │   └── prompt-safety.md
│   │   └── metadata.json
│   ├── config/
│   │   └── env.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.js
│   └── package.json
├── docs/                             # Documentation (challenge requirement)
│   ├── README.md                     # Problem, solution, prereqs, setup, deployment
│   ├── ARCHITECTURE.md               # Architecture diagram
│   ├── RAI.md                        # Responsible AI notes
│   └── plans/                        # Design docs
├── AGENTS.md                         # Custom instructions (challenge requirement)
├── mcp.json                          # MCP server config (challenge requirement)
├── presentations/
│   └── Repo-Ninja.pptx              # Demo deck (challenge requirement)
├── customer/                         # Optional customer testimonials
├── docker-compose.yml                # One-command local setup
├── Dockerfile                        # App container
├── .env.example                      # Environment template
├── LICENSE
└── README.md                         # Quick start
```

---

## 7. Features

### 7.1 Dashboard (Home Page `/`)

Command center showing GitHub connection status, active agents, and recent reports.

- GitHub account connection status with switch account option
- Quick action buttons: Scaffold New Repo, Start Code Review, Run Audit
- Active/recent agent tasks table with status and links
- Recent reports table with view/download actions

### 7.2 Scaffold New Repo (`/scaffold`)

Two input modes for creating new repositories grounded in best practices.

**Natural Language Mode:**
- Free-text description of desired project
- Semantic search against ChromaDB for relevant knowledge docs
- Copilot SDK generates scaffold plan with file structure + best practices applied
- User reviews plan, names repo, sets visibility
- On approval: Copilot SDK generates files, Octokit creates repo + commits

**Guided Mode:**
- Dropdowns for: Framework, Language, Auth, Database, Styling, CI/CD
- Selections mapped to knowledge base documents
- Same plan → review → create flow

**Data Flow:**
```
User input → ChromaDB semantic search → Build context prompt →
Copilot SDK generates plan → User approves → Copilot SDK generates files →
Octokit creates repo + commits → Return repo URL
```

### 7.3 Agent Management (`/agents`)

Assign GitHub issues to Copilot agents or spin up code-writing agents.

- Repository selector (fetches user's repos via Octokit)
- Open issues list with "Assign to Agent" action
- Free-form code writing with task description and target branch
- Active/recent agent tasks table with status, branch, and PR links
- SSE streaming for real-time agent progress

**Data Flow:**
```
User selects repo + issue → Octokit fetches issue/repo context →
ChromaDB retrieves agent instructions → Copilot SDK starts agent session →
Agent works on branch (streams progress via SSE) → Creates PR when done
```

### 7.4 Code Reviews (`/reviews`)

Run AI-powered code reviews with configurable review types and scope.

- Review type selection: Security, Performance, Accessibility, General Quality, Custom
- Scope: Full Repository, Specific PR, Specific Files (glob pattern)
- Structured findings with severity levels (HIGH/MED/LOW)
- Scoring per review category (out of 10)
- Downloadable PDF report

**Data Flow:**
```
User selects repo + review type + scope → Octokit fetches code/PR diff →
ChromaDB retrieves review instructions → Copilot SDK analyzes code →
Structured findings returned → PDF report generated on demand
```

### 7.5 Best Practices Audit (sub-section of `/reviews`)

Checks repo compliance against documented best practices from the knowledge base.

- Compliance score (percentage)
- Checklist of pass/fail/warning items
- Actionable recommendations
- Downloadable PDF report

### 7.6 Knowledge Base Manager (`/knowledge`)

CRUD interface for managing the knowledge documents that ground all agent behavior.

- Category filter and search
- Document list with edit/delete actions
- Markdown editor for document content
- "Save & Re-index" — saves file and re-embeds in ChromaDB
- "Re-index All Documents" — full rebuild of ChromaDB collection
- ChromaDB connection status and document count

---

## 8. Key Technical Decisions

### 8.1 Agent State Management
Agent tasks are long-running. SSE provides real-time progress updates. Task state persists in a simple SQLite DB (or JSON file) so the dashboard shows active/completed agents across page refreshes.

### 8.2 Knowledge Chunking
Documents are split by markdown headers before embedding. ChromaDB returns focused, relevant chunks rather than entire documents.

### 8.3 Azure Upgrade Path
The ChromaDB client is abstracted behind a `KnowledgeStore` interface:

```typescript
interface KnowledgeStore {
  search(query: string, topK: number): Promise<KnowledgeResult[]>;
  upsert(docId: string, content: string, metadata: DocMetadata): Promise<void>;
  delete(docId: string): Promise<void>;
  reindexAll(): Promise<void>;
}
```

Implementations: `ChromaDBStore` (local), `AzureAISearchStore` (Azure), `FoundryIQStore` (bonus).

### 8.4 Report Generation
`@react-pdf/renderer` for server-side PDF generation. Reports include findings, scores, and recommendations.

### 8.5 GitHub OAuth Scopes
`repo`, `read:user`, `read:org` — access private repos, user profile, and org membership.

---

## 9. Deployment

### Local (Zero Azure)

```bash
git clone https://github.com/rickcau/Repo-Ninja.git
cd Repo-Ninja
cp .env.example .env.local    # Add GitHub OAuth credentials
docker-compose up              # Starts Next.js + ChromaDB
```

### Docker Compose

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env.local
    depends_on: [chromadb]

  chromadb:
    image: chromadb/chroma:latest
    ports: ["8000:8000"]
    volumes: [chroma-data:/chroma/chroma]

volumes:
  chroma-data:
```

### Azure Deployment

- **Azure App Service** — Next.js application
- **Azure Container Apps** — ChromaDB (or swap to Azure AI Search)
- **Azure Key Vault** — Secrets management
- **Foundry IQ** — Optional upgrade for bonus points

---

## 10. Challenge Scoring Strategy

| Criterion | Points | How Repo-Ninja Addresses It |
|-----------|--------|----------------------------|
| Enterprise applicability & business value | 30 | Multi-feature agent platform; customizable knowledge base for any org |
| Azure/Microsoft integration | 25 | App Service + Container Apps; Azure AI Search swap; Foundry IQ support |
| Operational readiness | 15 | Docker Compose, GitHub Actions CI/CD, health checks |
| Security, governance & RAI | 15 | GitHub OAuth, RAI knowledge docs, security review agent, AGENTS.md |
| Storytelling & quality | 15 | Clean UI, 3-min demo video, architecture diagrams, deck |
| Bonus: Foundry IQ | 15 | KnowledgeStore interface with FoundryIQStore |
| Bonus: Customer validation | 10 | If available |
| Bonus: SDK feedback | 10 | Document feedback during development |

**Maximum possible: 135 points**

---

## 11. UI Wireframes

### Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ [=] Repo-Ninja                              [Settings] [User]  │
├─────────────────────────────────────────────────────────────────┤
│  Connected: github.com/rickcau           [Switch Account]       │
│                                                                 │
│  [+ Scaffold New Repo]  [Start Code Review]  [Run Audit]       │
│                                                                 │
│  -- Active Agents --                                            │
│  Agent          | Repo          | Task       | Status           │
│  Code Review    | my-app        | PR #42     | Running          │
│  Issue Solver   | api-service   | Issue #15  | Completed        │
│                                                                 │
│  -- Recent Reports --                                           │
│  Report              | Repo         | Date      | Action        │
│  Code Review Report  | my-app       | Feb 22    | [View]        │
│  Best Practices Audit| api-service  | Feb 21    | [View]        │
└─────────────────────────────────────────────────────────────────┘
```

### Scaffold Page

```
┌─────────────────────────────────────────────────────────────────┐
│ <- Scaffold New Repo                                            │
├─────────────────────────────────────────────────────────────────┤
│  [Natural Language]  [Guided]                                   │
│                                                                 │
│  Describe what you want to build:                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ I need a React/Next.js app with GitHub OAuth...         │    │
│  └─────────────────────────────────────────────────────────┘    │
│  [Generate Scaffold Plan]                                       │
│                                                                 │
│  -- Scaffold Plan --                                            │
│  Repo Name: my-new-app                                          │
│  Structure: /src, /prisma, /.github/workflows                   │
│  Best Practices Applied: TypeScript strict, ESLint, Security    │
│  Knowledge Sources: react-nextjs.md, security.md                │
│                                                                 │
│  Repo Name: [my-new-app]  Visibility: [Private v]              │
│  [Create Repo & Scaffold]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Management Page

```
┌─────────────────────────────────────────────────────────────────┐
│ <- Agent Management                                             │
├─────────────────────────────────────────────────────────────────┤
│  Repository: [rickcau/my-app v]        [Refresh]                │
│                                                                 │
│  -- Open Issues --                                              │
│  [ ] #15 Fix login redirect bug          [Assign to Agent]      │
│  [ ] #14 Add dark mode support           [Assign to Agent]      │
│  [Assign Selected to Agent]                                     │
│                                                                 │
│  -- Free-form Code Writing --                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Write a utility function that validates email...        │    │
│  └─────────────────────────────────────────────────────────┘    │
│  Target Branch: [feature/email-validation]                      │
│  [Start Code Writing Agent]                                     │
│                                                                 │
│  -- Active/Recent Tasks --                                      │
│  Task         | Issue/Desc   | Status   | Branch  | Action      │
│  Issue Solver | #15          | Running  | fix/15  | [View]      │
│  Code Writer  | Email valid  | Done     | feat/em | [PR]        │
└─────────────────────────────────────────────────────────────────┘
```

### Code Review Page

```
┌─────────────────────────────────────────────────────────────────┐
│ <- Code Reviews                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Repository: [rickcau/my-app v]                                 │
│  Review Type: [x] Security  [x] Performance  [ ] Accessibility  │
│  Scope: (o) Full Repo  ( ) PR #42  ( ) Files: src/lib/**        │
│  [Start Review]                                                 │
│                                                                 │
│  -- Results --                                                  │
│  Overall Score: 7.8/10                    [Download PDF]        │
│  Security:    8/10  (2 issues)                                  │
│  Performance: 7/10  (3 suggestions)                             │
│  Quality:     8/10  (1 issue)                                   │
│                                                                 │
│  Findings:                                                      │
│  ! HIGH: SQL injection risk in src/lib/db.ts:45                 │
│  ! MED:  Missing input validation in api/users.ts               │
│  i LOW:  Consider memoizing expensive computation               │
└─────────────────────────────────────────────────────────────────┘
```

### Knowledge Base Page

```
┌─────────────────────────────────────────────────────────────────┐
│ <- Knowledge Base                                               │
├─────────────────────────────────────────────────────────────────┤
│  Categories: [All v]  Search: [________]  [+ Add Document]      │
│                                                                 │
│  Name                    | Category        | Actions            │
│  react-nextjs.md         | Best Practices  | [Edit] [Del]       │
│  security-review.md      | Review Instr.   | [Edit] [Del]       │
│  github-actions.md       | CI/CD           | [Edit] [Del]       │
│                                                                 │
│  -- Editor --                                                   │
│  File: react-nextjs.md        Category: [Best Practices v]      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ # React/Next.js Best Practices                          │    │
│  │ ## Project Structure                                    │    │
│  │ - Use App Router (Next.js 13+)...                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│  [Save & Re-index]  [Cancel]                                    │
│                                                                 │
│  ChromaDB Status: Connected (47 documents indexed)              │
│  [Re-index All Documents]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-23 | Initial design document |
