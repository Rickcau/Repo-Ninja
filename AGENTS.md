# Repo-Ninja - Custom Instructions for GitHub Copilot

## Project Overview

Repo-Ninja is an AI-powered command center for GitHub development. It is a web-based platform that lets developers delegate repetitive tasks to GitHub Copilot agents, grounded in a customizable knowledge base of best practices, scaffolding templates, and review instructions stored in ChromaDB.

Key capabilities:
- **Scaffold new repos** from natural language or guided selections, grounded in best practices
- **Assign GitHub issues** to Copilot agents that work on branches and open PRs
- **Run AI code reviews** (security, performance, accessibility) with structured findings and PDF reports
- **Audit repos** against best practices from the knowledge base
- **Write code** via free-form agent tasks with real-time streaming progress

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI Components | Shadcn UI + TailwindCSS |
| Auth | NextAuth.js with GitHub OAuth provider |
| AI / Agents | @github/copilot-sdk |
| GitHub API | Octokit |
| Vector Database | ChromaDB (Docker sidecar) with chromadb-client |
| Reports | @react-pdf/renderer |
| Streaming | Server-Sent Events (SSE) |
| Container | Docker Compose |

## Code Conventions

### App Router (Next.js)
- All routes use the Next.js App Router under `src/app/`.
- Pages are in `src/app/<feature>/page.tsx`.
- API routes are in `src/app/api/<feature>/route.ts`.
- Use `"use client"` directive only in components that need browser APIs, event handlers, or React hooks like useState/useEffect.
- Server Components are the default. Keep data fetching in Server Components.

### Server vs Client Components
- **Server Components**: Data fetching, layout, pages that render static or server-fetched content.
- **Client Components**: Interactive UI (forms, buttons with onClick, real-time updates via SSE).
- Shared UI components in `src/components/ui/` (Shadcn) are client components.
- Feature-specific components in `src/components/<feature>/` can be either.

### API Route Patterns
- Each API route exports named HTTP method handlers: `GET`, `POST`, `PUT`, `DELETE`.
- Use `NextRequest` and `NextResponse` types.
- Long-running agent operations return SSE streams using `ReadableStream`.
- All API routes validate input before processing.
- Error responses use consistent shape: `{ error: string, details?: string }`.

### TypeScript
- Strict mode enabled. No `any` types unless absolutely necessary.
- Shared types live in `src/lib/types.ts`.
- Prefer interfaces for object shapes, type aliases for unions/intersections.

### Naming Conventions
- Files: kebab-case (`knowledge-store.ts`, `scaffold-panel.tsx`).
- Components: PascalCase (`ScaffoldPanel`, `AgentStatusBadge`).
- Functions/variables: camelCase.
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for config.

## File Structure

```
src/
  app/                    # Next.js App Router pages and API routes
    layout.tsx            # Root layout with providers
    page.tsx              # Dashboard home page
    scaffold/page.tsx     # Repo scaffolding UI
    agents/page.tsx       # Agent management UI
    reviews/page.tsx      # Code review and audit UI
    knowledge/page.tsx    # Knowledge base manager UI
    settings/page.tsx     # GitHub auth and configuration
    api/
      auth/[...nextauth]/ # GitHub OAuth endpoints
      scaffold/route.ts   # Scaffolding endpoints
      agents/route.ts     # Agent orchestration endpoints
      reviews/route.ts    # Code review endpoints
      knowledge/route.ts  # Knowledge base CRUD
      health/route.ts     # Health check
  components/
    ui/                   # Shadcn UI base components
    layout/               # Header, sidebar, navigation
    scaffold/             # Scaffolding feature components
    agents/               # Agent feature components
    reviews/              # Review feature components
    knowledge/            # Knowledge base components
    shared/               # Shared components (status badges, etc.)
  lib/
    copilot-sdk/          # GitHub Copilot SDK wrappers
    github/               # Octokit helpers
    chromadb/             # ChromaDB client and KnowledgeStore interface
    types.ts              # Shared TypeScript types
    utils.ts              # General utilities
  hooks/                  # Custom React hooks
  knowledge-base/         # Default knowledge base markdown documents
  config/
    env.ts                # Environment variable validation
```

## Testing Approach

- **Unit tests**: Vitest for utility functions and library code in `src/lib/`.
- **Component tests**: React Testing Library for UI components.
- **API route tests**: Vitest with mocked dependencies (Octokit, ChromaDB client, Copilot SDK).
- **Integration tests**: Test API routes with real ChromaDB instance via Docker.
- Tests live alongside source files as `*.test.ts` / `*.test.tsx`.
- CI runs `npm run build` (lint errors fail the build). Test suite is being developed.

## Key Abstractions

### KnowledgeStore Interface
All vector DB access goes through the `KnowledgeStore` interface in `src/lib/chromadb/`. This allows swapping ChromaDB for Azure AI Search or Foundry IQ without changing business logic.

### Agent Sessions
Long-running Copilot SDK agent sessions are managed via SSE. The client receives progress events and the final result (branch name, PR URL, etc.).

## Environment Variables

See `.env.example` for required variables. Key ones:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth app credentials
- `NEXTAUTH_SECRET` - NextAuth.js session encryption
- `CHROMADB_URL` - ChromaDB server URL (default: `http://localhost:8000`)
- `GITHUB_COPILOT_API_KEY` - Copilot SDK authentication
