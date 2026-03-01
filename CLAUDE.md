# CLAUDE.md


## Git Workflow Rules (MANDATORY)

- **PRE-FLIGHT CHECK (ALWAYS DO THIS FIRST):** Before making ANY code changes — including creating files, editing files, running database migrations, or writing task lists that lead to code changes — run `git branch --show-current` to check the current branch. If you are on `main`, you MUST either:
  1. Create a new feature branch (`git checkout -b feature/descriptive-name`), OR
  2. Ask the user what branch name to use if the task is ambiguous.
  **Do not proceed with any implementation work until you are on a non-main branch.** This check must happen at the very start of every task, before any other action.
- **NEVER make code changes directly on the `main` branch.** The `main` branch must always remain in a known working state.
- Before starting any feature, bug fix, or refactor, **create a new branch** first:
  ```bash
  git checkout -b feature/descriptive-name
  ```
- If you are currently on `main` and are asked to implement changes, **you must create a branch first** before writing any code. Ask the user for a branch name if the task is ambiguous.
- **NEVER commit or merge to `main` without explicit user confirmation.** After making changes, wait for the user to test and confirm everything works before committing and merging. Do not assume a fix is ready just because TypeScript compiles or the code looks correct.
- Only merge back to `main` after the feature is verified working.
- **ALWAYS use `--no-ff` when merging to `main`** (`git merge --no-ff branch-name`). Never fast-forward merge. This preserves the branch history so every merge is visible as a merge commit in the log.
- This rule exists because a broken `main` branch means there is no safe state to revert to.

## Git Commit Rules
- **NEVER commit as Claude.** All commits MUST use the repository owner's identity. Before every `git commit`, run `git config user.name` and `git config user.email` to verify the author is NOT "Claude" or "noreply@anthropic.com". If the git config is set to Claude's identity, fix it before committing by using `--author` flag with the repo owner's name and email.
- Never include "Co-Authored-By" lines in git commit messages
- Never include "Claude", "Anthropic", or any AI attribution in commit messages, author fields, or trailers

## What This Project Is

Repo-Ninja is an AI-powered command center for GitHub development workflows. It lets developers delegate scaffolding, code reviews, issue resolution, and best practices audits to GitHub Copilot agents — all grounded in a customizable knowledge base stored in ChromaDB.

**Tech stack:**
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Shadcn UI
- **Auth:** NextAuth.js with GitHub OAuth
- **AI:** GitHub Copilot SDK for agent orchestration
- **Vector DB:** ChromaDB for semantic search over knowledge base documents
- **GitHub API:** Octokit for repo operations (creating repos, fetching issues, opening PRs)
- **Deployment:** Docker Compose (app + ChromaDB sidecar), deployable to Azure

**Key directories:**
- `src/app/` — Next.js pages and API routes
- `src/components/` — React components (Shadcn UI in `ui/`, layout in `layout/`, feature-specific in their own dirs)
- `src/lib/` — Core libraries (chromadb client, copilot-sdk wrapper, octokit helper, agent-store, types)
- `src/knowledge-base/` — Seed documents for the knowledge base (best-practices, scaffolding templates, etc.)
- `docs/` — Setup guides, architecture docs, style guide, implementation plans

## Code Conventions

- **File naming:** kebab-case for all files (e.g., `theme-toggle.tsx`, not `themeToggle.tsx` or `theme_toggle.tsx`)
- **Tailwind CSS v4:** No `tailwind.config.ts` — all config is in `src/app/globals.css` via `@theme inline`. Colors use `oklch()` format.
- **Component patterns:** Use Shadcn UI components from `src/components/ui/`. Import with `@/components/ui/...`
- **Path aliases:** `@/` maps to `src/`
- **API routes:** All in `src/app/api/`. Follow Next.js App Router conventions (export `GET`, `POST`, etc.)
- **Dark mode:** Default theme is dark. All colors use CSS custom properties — never hardcode hex/rgb values in components.
- **Icons:** Lucide React, always `h-4 w-4` inline size

## Session Persistence

Progress is tracked in `docs/plans/SESSION-TRACKER.md`. At the end of every session (or when the user says to stop):
1. Update the session tracker with current status, what was completed, and what's next
2. List any uncommitted files
3. Record the current branch

When resuming a session, read `docs/plans/SESSION-TRACKER.md` first to understand where we left off.

## Implementation Plans

- **v1 (Claude):** `docs/plans/2026-02-23-repo-ninja-implementation-v1.md`
- **v2 (AI-agnostic):** `docs/plans/2026-02-23-repo-ninja-implementation-v2.md`
- **Style guide:** `docs/frontend-ux-ui-style-guide.md`

Tasks in the implementation plans are marked with status tags: `[COMPLETED]`, `[COMPLETED*]` (minor gap), `[NOT STARTED]`.

## Testing

- Unit tests are in `src/__tests__/`
- Run tests: `cd src && npx jest --verbose`
- Build check: `cd src && npx next build`
- Docker: `docker-compose up -d` then verify at http://localhost:3000

## Token Conservation

- Prefer concise responses. Don't repeat back large code blocks unnecessarily.
- When debugging, try the simplest fix first before proposing multi-file refactors.
- Don't re-read files you've already read in the same session unless the file has changed.
- When showing diffs or changes, only show the relevant lines — not the entire file.
- Use parallel sub-agents for independent tasks to reduce back-and-forth.

## Docker Rules

- Source code changes require a Docker rebuild. After modifying files under `src/`, remind the user:
  ```bash
  docker-compose down && docker-compose up -d --build
  ```
- Environment variable changes (`.env.local`) do NOT require `--build` — just restart:
  ```bash
  docker-compose down && docker-compose up -d
  ```
- Never modify `docker-compose.yml` or `Dockerfile` without explaining what changed and why.

## No-Go Zones

Do NOT modify these files unless the user explicitly asks:
- `.env.local` — Contains real secrets. Never read it aloud or log its contents.
- `src/package-lock.json` — Auto-generated by npm. Never edit directly.
- `src/components/ui/` — Shadcn UI components. These are managed by the `npx shadcn` CLI. Don't hand-edit them.
- `docs/plans/2026-02-23-repo-ninja-design.md` — Approved design doc. Treat as read-only reference.