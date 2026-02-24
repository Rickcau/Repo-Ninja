# Repo-Ninja

AI-powered command center for GitHub development. Delegate scaffolding, code reviews, issue resolution, and best practices audits to GitHub Copilot agents — all grounded in your team's own knowledge base.

Built with Next.js, GitHub Copilot SDK, ChromaDB, and Octokit.

> This project is a submission for the **GitHub Copilot SDK Enterprise Challenge (Q3 FY26)**.

---

## Problem

Enterprise developers spend significant time on repetitive setup, code review, and standards enforcement tasks. Existing tools address these individually, but there is no unified platform that lets teams delegate this work to AI agents grounded in their own best practices and standards. Teams need a single command center where they can point agents at real work — scaffolding repos, solving issues, reviewing code — and trust that the output follows their organization's conventions.

## Solution

**Repo-Ninja** is a web-based platform that uses the GitHub Copilot SDK to orchestrate AI agents for common development tasks. Every agent action is grounded in a customizable knowledge base of best practices, scaffolding templates, and review instructions stored in ChromaDB. This means the AI does not hallucinate generic advice — it applies your team's actual standards.

## Features

### 1. Repo Scaffolding
Describe a project in natural language or use guided dropdowns (framework, language, auth, database, CI/CD). Repo-Ninja searches the knowledge base for relevant best practices, generates a scaffold plan for your review, and then creates a fully-structured GitHub repository with all files committed.

### 2. Issue Assignment to Agents
Select a repository, browse open issues, and assign them to a Copilot agent. The agent reads the issue context, retrieves relevant instructions from the knowledge base, works on a feature branch, and opens a pull request when done.

### 3. AI Code Reviews
Run code reviews against a full repository, a specific PR, or a file glob pattern. Choose review types (Security, Performance, Accessibility, General Quality) and receive structured findings with severity levels, category scores, and actionable suggestions.

### 4. Best Practices Audits
Audit a repository against your documented best practices. Receive a compliance score, a checklist of pass/fail/warning items, and actionable recommendations.

### 5. Agent Code Writing
Describe a coding task in free-form text, specify a target branch, and let a Copilot agent write the code. The agent uses knowledge base context to follow your team's conventions, and the result is a PR ready for review.

---

## Quick Start (Docker)

The fastest way to get Repo-Ninja running. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) and a [GitHub account](https://github.com).

**1. Register a GitHub OAuth App** at [github.com/settings/developers](https://github.com/settings/developers) — click "OAuth Apps" > "New OAuth App":

| Field | Value |
|-------|-------|
| **Homepage URL** | `http://localhost:3000` |
| **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` |

Copy the **Client ID** and generate a **Client Secret**.

**2. Clone and configure:**

```bash
git clone https://github.com/rickcau/Repo-Ninja.git
cd Repo-Ninja
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_URL=http://localhost:3000
CHROMADB_URL=http://localhost:8000
```

**3. Start:**

```bash
docker-compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

**4. Stop:**

```bash
docker-compose down
```

---

## Setup Guides

| Guide | Description |
|-------|-------------|
| [Docker Setup](docs/setup-docker.md) | Full Docker guide with troubleshooting, common commands, and detailed configuration |
| [Local Development](docs/setup-local.md) | Run the Next.js app locally with hot reload (ChromaDB in Docker or standalone) |
| [Deploy to Azure](docs/setup-azure.md) | Deploy to Azure Container Apps or App Service with CI/CD and Key Vault |

---

## Architecture Overview

Repo-Ninja follows a **monolith Next.js + ChromaDB sidecar** architecture:

- **Next.js App** handles both the React UI (App Router with Server and Client Components) and API routes that orchestrate agents.
- **ChromaDB** runs as a Docker sidecar container providing semantic search over the knowledge base.
- **GitHub Copilot SDK** powers all agent interactions (scaffolding, code writing, reviews).
- **Octokit** manages all GitHub API operations (creating repos, fetching issues, opening PRs).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture diagram and data flow.

## Responsible AI

Repo-Ninja is designed with responsible AI principles. See [docs/RAI.md](docs/RAI.md) for details on:

- Data handling and privacy
- Transparency and explainability
- Human-in-the-loop design
- Bias mitigation
- Security practices

## Deployment

See the [Azure Deployment Guide](docs/setup-azure.md) for step-by-step instructions covering Azure Container Apps, App Service, Key Vault, and CI/CD.

## License

See [LICENSE](LICENSE).
