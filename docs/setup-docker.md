# Docker Setup Guide

This guide walks you through setting up and running **Repo-Ninja** using Docker. Repo-Ninja is an AI-powered command center for GitHub development workflows, built with Next.js 16, ChromaDB, the GitHub Copilot SDK, and Octokit. It uses GitHub OAuth via NextAuth.js for authentication.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [What Docker Compose Starts](#what-docker-compose-starts)
4. [Common Docker Commands](#common-docker-commands)
5. [Troubleshooting](#troubleshooting)
6. [Updating](#updating)

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Docker Desktop** -- Download and install from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). After installation, launch Docker Desktop and wait for it to fully start. You should see the Docker whale icon in your system tray (Windows) or menu bar (Mac) once it is ready.
- **A GitHub account** -- Any GitHub account works (personal, organization, or enterprise). You will use this to register an OAuth App and to sign in to Repo-Ninja.
- **Git** -- Download from [git-scm.com](https://git-scm.com/) if you don't already have it.

---

## Quick Start

This is the fastest path from zero to a running instance of Repo-Ninja.

### 1. Clone the repository

```bash
git clone https://github.com/rickcau/Repo-Ninja.git
cd Repo-Ninja
```

### 2. Create your environment file

```bash
cp .env.example .env.local
```

### 3. Register a GitHub OAuth App

Repo-Ninja needs a GitHub OAuth App so users can sign in with their GitHub account. This is a one-time setup step.

1. Go to [github.com/settings/developers](https://github.com/settings/developers).
2. Click **"OAuth Apps"** in the left sidebar.
3. Click **"New OAuth App"**.
4. Fill in the form:

   | Field                          | Value                                                  |
   |--------------------------------|--------------------------------------------------------|
   | **Application name**           | `Repo-Ninja` (or any name you prefer)                  |
   | **Homepage URL**               | `http://localhost:3000`                                 |
   | **Application description**    | *(optional)* AI-powered command center for GitHub       |
   | **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github`        |

5. Click **"Register application"**.
6. Copy the **Client ID** shown on the next page.
7. Click **"Generate a new client secret"** and copy the secret immediately -- you will not be able to see it again.

> For more detailed instructions, see the [main README](../README.md#step-1-register-a-github-oauth-app).

### 4. Configure environment variables

Open `.env.local` in a text editor and fill in the values:

```bash
# Paste the Client ID and Client Secret from the GitHub OAuth App you just created
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Session encryption key -- generate with the command below
NEXTAUTH_SECRET=paste-your-generated-secret-here

# Leave these as-is for local development
NEXTAUTH_URL=http://localhost:3000
CHROMADB_URL=http://localhost:8000
```

To generate a value for `NEXTAUTH_SECRET`, run one of these commands:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or, if you have OpenSSL installed:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value of `NEXTAUTH_SECRET`. Do not use a plain-text phrase -- it must be a randomly generated value.

**Summary of environment variables:**

| Variable               | Purpose                                  | Default for local dev          |
|------------------------|------------------------------------------|--------------------------------|
| `GITHUB_CLIENT_ID`    | Identifies your app to GitHub            | *(from your OAuth App)*        |
| `GITHUB_CLIENT_SECRET` | Proves your app's identity to GitHub    | *(from your OAuth App)*        |
| `NEXTAUTH_SECRET`     | Encrypts user sessions                   | *(generate a random value)*    |
| `NEXTAUTH_URL`        | Base URL of your application             | `http://localhost:3000`        |
| `CHROMADB_URL`        | URL where ChromaDB is accessible         | `http://localhost:8000`        |

### 5. Start the application

Make sure Docker Desktop is running first, then use one of these methods:

**Windows (PowerShell):**

```powershell
.\start.ps1
```

**Mac/Linux (Bash):**

```bash
./start.sh
```

**Or run Docker Compose directly:**

```bash
docker-compose up -d
```

The first startup will take a few minutes as Docker downloads the base images and builds the application. Subsequent starts will be much faster.

### 6. Open the application

Once the containers are running, open your browser and go to:

**[http://localhost:3000](http://localhost:3000)**

Click **"Sign in with GitHub"** and authorize the application when prompted.

---

## What Docker Compose Starts

Running `docker-compose up -d` starts two services:

| Service      | Container        | Port  | Description                                                        |
|-------------|------------------|-------|--------------------------------------------------------------------|
| **app**     | Next.js app      | 3000  | The Repo-Ninja web application (UI and API routes)                 |
| **chromadb**| ChromaDB         | 8000  | Vector database for the knowledge base (semantic search)           |

### Service dependencies

The `app` service depends on `chromadb` with a health check condition. Docker Compose will not start the Next.js app until ChromaDB reports healthy. ChromaDB checks for a successful TCP connection on port 8000 every 10 seconds, with up to 5 retries and a 15-second startup grace period.

### How environment variables are injected

Environment variables are injected **at runtime**, not at build time. The `docker-compose.yml` uses `env_file: .env.local` to pass your variables into the running container. This means:

- You do **not** need to rebuild the image when you change an environment variable.
- You **do** need to stop and restart the containers for changes to take effect (see [Troubleshooting](#env-var-changes-not-taking-effect) below).
- The `CHROMADB_URL` is overridden inside the Docker network to `http://chromadb:8000` so that the app container can reach ChromaDB by its service name, regardless of what you set in `.env.local`.

### Data persistence

ChromaDB data is stored in a named Docker volume called `chroma-data`. This means your knowledge base data survives container restarts and rebuilds. To completely reset ChromaDB data, remove the volume:

```bash
docker volume rm repo-ninja_chroma-data
```

---

## Common Docker Commands

All commands should be run from the repository root directory (where `docker-compose.yml` is located).

### View logs (all services, streaming)

```bash
docker-compose logs -f
```

### View logs for a specific service

```bash
docker-compose logs app
```

```bash
docker-compose logs chromadb
```

Add `-f` to follow (stream) the logs in real time:

```bash
docker-compose logs -f app
```

### Check container status

```bash
docker-compose ps
```

This shows whether each service is running, its health status, and which ports are exposed.

### Stop all services

```bash
docker-compose down
```

This stops and removes the containers but preserves the ChromaDB data volume.

### Rebuild after code changes

If you have made changes to the application source code, you need to rebuild the Docker image:

```bash
docker-compose down && docker-compose up -d --build
```

### Restart without rebuilding

If you only changed environment variables (not source code):

```bash
docker-compose down && docker-compose up -d
```

---

## Troubleshooting

### Docker Desktop not running

**Symptom:** `docker-compose up` fails with an error like:

```
error during connect: ... pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

**Fix:** Open Docker Desktop from your Start menu (Windows) or Applications folder (Mac). Wait for it to fully start -- the whale icon in the system tray should stop animating. Then try the command again.

### `.env.local` not found

**Symptom:** `docker-compose up` fails with an error mentioning `.env.local`.

**Fix:** You need to create the environment file. From the repository root:

```bash
cp .env.example .env.local
```

Then fill in the values as described in the [Quick Start](#4-configure-environment-variables) section above.

### Port 3000 already in use

**Symptom:** The app container fails to start or you see a port binding error.

**Fix:** Another application is already using port 3000. Either stop that application, or change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"   # Maps host port 3001 to container port 3000
```

If you change the host port, also update `NEXTAUTH_URL` in `.env.local` to match (e.g., `http://localhost:3001`) and update the **Authorization callback URL** in your GitHub OAuth App settings accordingly.

### ChromaDB unhealthy

**Symptom:** `docker-compose ps` shows ChromaDB as "unhealthy", or the Settings page in Repo-Ninja shows ChromaDB as disconnected.

**Fix:**

1. Check the ChromaDB logs for errors:

   ```bash
   docker-compose logs chromadb
   ```

2. Try restarting just the ChromaDB service:

   ```bash
   docker-compose restart chromadb
   ```

3. If the issue persists, remove the container and its data and start fresh:

   ```bash
   docker-compose down
   docker volume rm repo-ninja_chroma-data
   docker-compose up -d
   ```

### Env var changes not taking effect

**Symptom:** You edited `.env.local` but the application is still using the old values.

**Fix:** Docker Compose reads the env file when containers start, not while they are running. You must stop and restart:

```bash
docker-compose down
docker-compose up -d
```

You do **not** need `--build` for env var changes since they are injected at runtime.

### GitHub OAuth errors

**Symptom:** Clicking "Sign in with GitHub" shows an error, redirects to an error page, or returns a 401/403.

**Fix:** Check the following:

1. Verify that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local` exactly match the values shown on your [GitHub OAuth App settings page](https://github.com/settings/developers).

2. Confirm the **Authorization callback URL** on your GitHub OAuth App is set to exactly:

   ```
   http://localhost:3000/api/auth/callback/github
   ```

   There should be no trailing slash.

3. Make sure `NEXTAUTH_URL=http://localhost:3000` is set in `.env.local`.

4. If you recently regenerated your client secret on GitHub, update the value in `.env.local` and restart:

   ```bash
   docker-compose down && docker-compose up -d
   ```

### App loads slowly on first start

**Symptom:** After `docker-compose up -d`, visiting `http://localhost:3000` shows a blank page or connection refused.

**Fix:** The first build can take 30-60 seconds. Check the build progress with:

```bash
docker-compose logs -f app
```

Wait until you see output indicating the server is ready before accessing the application.

---

## Updating

When new changes are available in the repository, pull the latest code and rebuild:

```bash
git pull && docker-compose down && docker-compose up -d --build
```

The `--build` flag ensures the Docker image is rebuilt with the latest source code. Your ChromaDB data volume will be preserved across rebuilds.
