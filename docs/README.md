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
- **A GitHub account** (any GitHub account works — personal, organization, or enterprise)

## Setup Instructions

### Step 1: Register a GitHub OAuth App

Repo-Ninja uses GitHub OAuth so that users can sign in with their GitHub account. Before running the app, you need to register it as an OAuth App with GitHub. This is a one-time setup step — it tells GitHub "this application exists and is allowed to request sign-in from users."

**Why is this needed?** When a user clicks "Sign in with GitHub" in Repo-Ninja, GitHub needs to know which application is making the request. The Client ID and Client Secret you get from this step are like an API key for your app — they identify the *application*, not any specific user. Any GitHub user can sign in through your app once it's registered.

**How to do it:**

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**
4. Fill in the form:

   | Field | Value |
   |-------|-------|
   | **Application name** | `Repo-Ninja` (or any name you like) |
   | **Homepage URL** | `http://localhost:3000` |
   | **Application description** | (optional) AI-powered command center for GitHub development |
   | **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` |

5. Click **"Register application"**
6. On the next page, you'll see your **Client ID** — copy it
7. Click **"Generate a new client secret"** — copy the secret immediately (you won't see it again)

> **Deploying to Azure?** When you deploy to a public URL, come back to this page and update the **Homepage URL** and **Authorization callback URL** to your Azure URL (e.g., `https://repo-ninja.azurewebsites.net` and `https://repo-ninja.azurewebsites.net/api/auth/callback/github`).

> **Important:** Do NOT enable "Device Flow" — that is for CLI tools. Repo-Ninja uses the standard web browser redirect flow.

### Step 2: Clone the repository

```bash
git clone https://github.com/rickcau/Repo-Ninja.git
cd Repo-Ninja
```

### Step 3: Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill in the values:

```bash
# Paste the Client ID and Client Secret from Step 1
GITHUB_CLIENT_ID=your-client-id-from-step-1
GITHUB_CLIENT_SECRET=your-client-secret-from-step-1

# Session encryption key — generate one by running:
#   openssl rand -base64 32
# or use any random 32+ character string
NEXTAUTH_SECRET=paste-your-generated-secret-here

# Leave these as-is for local development
NEXTAUTH_URL=http://localhost:3000
CHROMADB_URL=http://localhost:8000
```

| Variable | What it is | Where to get it |
|----------|-----------|-----------------|
| `GITHUB_CLIENT_ID` | Identifies your app to GitHub | Step 1 above |
| `GITHUB_CLIENT_SECRET` | Proves your app's identity to GitHub | Step 1 above |
| `NEXTAUTH_SECRET` | Encrypts user sessions (random string) | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app's URL | `http://localhost:3000` for local dev |
| `CHROMADB_URL` | Where ChromaDB is running | `http://localhost:8000` (default) |

### Step 4: Start the application

```bash
docker-compose up
```

This starts two services:
- **Repo-Ninja web app** on [http://localhost:3000](http://localhost:3000)
- **ChromaDB** (knowledge base search engine) on port 8000

### Step 5: Sign in and use

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **"Sign in with GitHub"**
3. GitHub will ask you to authorize the Repo-Ninja app — click **"Authorize"**
4. You're in! Any GitHub user can sign in this way.

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

1. **Deploy the app** to Azure App Service (or Azure Container Apps)
2. **Deploy ChromaDB** to Azure Container Apps (or swap to Azure AI Search via the KnowledgeStore interface)
3. **Set environment variables** in Azure App Service Configuration:
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` — same values from your GitHub OAuth App
   - `NEXTAUTH_SECRET` — same session encryption key
   - `NEXTAUTH_URL` — your Azure URL (e.g., `https://repo-ninja.azurewebsites.net`)
   - `CHROMADB_URL` — your ChromaDB container URL
4. **Update your GitHub OAuth App** at [github.com/settings/developers](https://github.com/settings/developers):
   - Change **Homepage URL** to your Azure URL
   - Change **Authorization callback URL** to `https://your-app.azurewebsites.net/api/auth/callback/github`
5. Optional: Use **Azure Key Vault** for secrets management
6. Optional: **Foundry IQ** integration via the KnowledgeStore interface

## License

See [LICENSE](../LICENSE).
