# Repo-Ninja Documentation

## Problem

Enterprise developers spend significant time on repetitive setup, code review, and standards enforcement tasks. Existing tools address these individually, but there is no unified platform that lets teams delegate this work to AI agents grounded in their own best practices and standards. Teams need a single command center where they can point agents at real work -- scaffolding repos, solving issues, reviewing code -- and trust that the output follows their organization's conventions.

## Solution

**Repo-Ninja** is a web-based platform that uses the GitHub Copilot SDK to orchestrate AI agents for common development tasks. Every agent action is grounded in a customizable knowledge base of best practices, scaffolding templates, and review instructions stored in ChromaDB. This means the AI does not hallucinate generic advice -- it applies your team's actual standards.

## Features

### 1. Repo Scaffolding
Describe a project in natural language or use guided dropdowns (framework, language, auth, database, CI/CD). Repo-Ninja searches the knowledge base for relevant best practices, generates a scaffold plan for your review, and then creates a fully-structured GitHub repository with all files committed.

### 2. Issue Assignment to Agents
Select a repository, browse open issues, and assign them to a Copilot agent. The agent reads the issue context, retrieves relevant instructions from the knowledge base, works on a feature branch, and opens a pull request when done. Real-time progress is streamed via SSE.

### 3. AI Code Reviews
Run code reviews against a full repository, a specific PR, or a file glob pattern. Choose review types (Security, Performance, Accessibility, General Quality) and receive structured findings with severity levels (HIGH/MED/LOW), category scores, and a downloadable PDF report.

### 4. Best Practices Audits
Audit a repository against your documented best practices. Receive a compliance score, a checklist of pass/fail/warning items, and actionable recommendations. Results are available as a downloadable PDF report.

### 5. Agent Code Writing
Describe a coding task in free-form text, specify a target branch, and let a Copilot agent write the code. The agent uses knowledge base context to follow your team's conventions. Progress streams in real-time, and the result is a PR ready for review.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **Docker** and **Docker Compose** (for ChromaDB sidecar)
- **GitHub OAuth App** (create one at [github.com/settings/developers](https://github.com/settings/developers))
  - Callback URL: `http://localhost:3000/api/auth/callback/github`
  - Scopes needed: `repo`, `read:user`, `read:org`
- **GitHub Copilot SDK API Key**

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/rickcau/Repo-Ninja.git
cd Repo-Ninja
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `NEXTAUTH_SECRET` | Random string for session encryption (use `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `CHROMADB_URL` | `http://localhost:8000` (default for Docker Compose) |
| `GITHUB_COPILOT_API_KEY` | Copilot SDK API key |

### 3. Start the application

```bash
docker-compose up
```

This starts:
- **Next.js app** on port 3000
- **ChromaDB** on port 8000

### 4. Open the application

Navigate to [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

### Alternative: Run without Docker

```bash
cd src
npm install
npm run dev
```

You will need to run ChromaDB separately (`docker run -p 8000:8000 chromadb/chroma:latest`).

## Architecture Overview

Repo-Ninja follows a **monolith Next.js + ChromaDB sidecar** architecture:

- **Next.js App** handles both the React UI (App Router with Server and Client Components) and API routes that orchestrate agents.
- **ChromaDB** runs as a Docker sidecar container providing semantic search over the knowledge base.
- **GitHub Copilot SDK** powers all agent interactions (scaffolding, code writing, reviews).
- **Octokit** manages all GitHub API operations (creating repos, fetching issues, opening PRs).
- **SSE (Server-Sent Events)** streams real-time agent progress to the browser.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architecture diagram and data flow.

## Responsible AI

Repo-Ninja is designed with responsible AI principles. See [RAI.md](RAI.md) for details on:

- Data handling and privacy
- Transparency and explainability
- Human-in-the-loop design
- Bias mitigation
- Security practices

## Deployment

### Local Development
Use `docker-compose up` for a one-command setup.

### Azure Deployment
- **Azure App Service** for the Next.js application
- **Azure Container Apps** for ChromaDB (or swap to Azure AI Search)
- **Azure Key Vault** for secrets management
- Optional: **Foundry IQ** integration via the KnowledgeStore interface

## License

See [LICENSE](../LICENSE).
