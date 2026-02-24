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

## Prerequisites

- **Node.js 20+** (LTS recommended) — [Download here](https://nodejs.org/)
- **Docker Desktop** (recommended) — [Download here](https://www.docker.com/products/docker-desktop/)
  - Docker is used to run the app and ChromaDB together with one command
  - If you don't want to use Docker, see [Running without Docker](#running-without-docker) below
- **A GitHub account** (any GitHub account works — personal, organization, or enterprise)

---

## Setup Instructions

### Step 1: Register a GitHub OAuth App

Repo-Ninja uses GitHub OAuth so that users can sign in with their GitHub account. Before running the app, you need to register it as an OAuth App with GitHub. This is a **one-time setup step** — it tells GitHub "this application exists and is allowed to request sign-in from users."

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
   | **Application description** | *(optional)* AI-powered command center for GitHub development |
   | **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` |

5. Click **"Register application"**
6. On the next page, you'll see your **Client ID** — copy it
7. Click **"Generate a new client secret"** — copy the secret immediately (you won't see it again)

> **Deploying to Azure or another host?** When you deploy to a public URL, come back to this page and update the **Homepage URL** and **Authorization callback URL** to your deployed URL (e.g., `https://repo-ninja.azurewebsites.net` and `https://repo-ninja.azurewebsites.net/api/auth/callback/github`).

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

**Make sure Docker Desktop is running first.** You should see the Docker whale icon in your system tray (Windows) or menu bar (Mac). If it's not running, open Docker Desktop from your Start menu / Applications and wait for it to fully start.

```bash
docker-compose up -d
```

This starts two services:
- **Repo-Ninja web app** on [http://localhost:3000](http://localhost:3000)
- **ChromaDB** (knowledge base search engine) on port 8000

To see logs (helpful for debugging):

```bash
docker-compose logs -f
```

To stop everything:

```bash
docker-compose down
```

### Step 5: Sign in and use

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **"Sign in with GitHub"**
3. GitHub will ask you to authorize the Repo-Ninja app — click **"Authorize"**
4. You're in! Any GitHub user can sign in this way.

---

## Troubleshooting

### `docker-compose up` fails with "pipe/dockerDesktopLinuxEngine: The system cannot find the file specified"

**Docker Desktop is not running.** Open Docker Desktop from your Start menu (Windows) or Applications (Mac), wait for it to fully start (the whale icon in the system tray should stop animating), then try again.

### `docker-compose up` fails with ".env.local not found"

You haven't created the environment file yet. Run:

```bash
cp .env.example .env.local
```

Then fill in the values as described in [Step 3](#step-3-configure-environment-variables).

### `docker-compose up` succeeds but the app won't load at localhost:3000

- Wait 30-60 seconds — the app takes time to build on first start
- Check the logs: `docker-compose logs app`
- Make sure port 3000 isn't already in use by another application

### "Sign in with GitHub" shows an error

- Double-check that your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local` match what's shown on your [GitHub OAuth App page](https://github.com/settings/developers)
- Make sure the **Authorization callback URL** on your GitHub OAuth App is exactly `http://localhost:3000/api/auth/callback/github` (no trailing slash)
- If you regenerated your client secret, update `.env.local` and restart: `docker-compose down && docker-compose up -d`

### ChromaDB shows "disconnected" on the Settings page

- Check if ChromaDB is running: `docker-compose ps` — the `chromadb` service should show "running" and "healthy"
- If it's not healthy, check its logs: `docker-compose logs chromadb`
- Make sure `CHROMADB_URL=http://localhost:8000` is set in `.env.local`

---

## Running without Docker

If you prefer not to use Docker, you can run the Next.js app directly with Node.js. You will still need Docker (or another method) to run ChromaDB.

### Option A: Node.js app + ChromaDB in Docker

```bash
# Terminal 1: Start ChromaDB
docker run -d -p 8000:8000 --name chromadb chromadb/chroma:latest

# Terminal 2: Start the Next.js app
cd src
npm install
npm run dev
```

### Option B: Everything without Docker

```bash
# Install and run ChromaDB via pip (requires Python 3.9+)
pip install chromadb
chroma run --host 0.0.0.0 --port 8000

# In another terminal, start the Next.js app
cd src
npm install
npm run dev
```

In both cases, make sure your `.env.local` file exists in the repo root with the values from [Step 3](#step-3-configure-environment-variables).

The app will be available at [http://localhost:3000](http://localhost:3000).

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

## Deployment to Azure

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

See [LICENSE](LICENSE).
