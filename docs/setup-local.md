# Local Development Setup Guide

This guide walks you through setting up **Repo-Ninja** for local development. Repo-Ninja is an AI-powered command center for GitHub development workflows, built with Next.js 16, ChromaDB, the GitHub Copilot SDK, and Octokit. It uses GitHub OAuth via NextAuth.js for authentication.

There are two paths depending on whether you want to run ChromaDB in Docker (recommended) or install it natively with Python.

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20+ (LTS recommended) | Download from [nodejs.org](https://nodejs.org/) |
| **npm** | Comes with Node.js | Verify with `npm --version` |
| **Git** | Any recent version | Download from [git-scm.com](https://git-scm.com/) |
| **Python** | 3.9+ | Only required if running ChromaDB without Docker (Option B) |
| **Docker Desktop** | Latest | Only required if running ChromaDB in Docker (Option A) |
| **GitHub account** | N/A | Needed for OAuth App registration and GitHub API access |

Verify your installations:

```bash
node --version    # should print v20.x.x or higher
npm --version
git --version
```

---

## GitHub OAuth App Registration

Both options below require a GitHub OAuth App. If you do not already have one, create it now:

1. Go to **Settings > Developer settings > OAuth Apps > New OAuth App** at [https://github.com/settings/developers](https://github.com/settings/developers).
2. Fill in the form:
   - **Application name**: `Repo-Ninja (local dev)` (or any name you like)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Click **Register application**.
4. Copy the **Client ID**.
5. Click **Generate a new client secret** and copy it immediately -- you will not be able to see it again.

You will use these values in the `.env.local` file below.

---

## Option A: Node.js App + ChromaDB in Docker (Recommended)

This is the recommended approach. Docker handles ChromaDB so you do not need to install Python or manage ChromaDB dependencies.

### 1. Start ChromaDB

```bash
docker run -d -p 8000:8000 --name chromadb chromadb/chroma:latest
```

Verify it is running:

```bash
curl http://localhost:8000/api/v2/heartbeat
```

You should see a JSON response with a nanosecond timestamp.

### 2. Clone the Repository

```bash
git clone https://github.com/your-org/Repo-Ninja.git
cd Repo-Ninja
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in the values. Generate the `NEXTAUTH_SECRET` with this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the output as the value for `NEXTAUTH_SECRET`. See the [Environment Variables](#environment-variables) section below for a full reference.

### 4. Install Dependencies and Start the Dev Server

```bash
cd src
npm install
npm run dev
```

### 5. Open the App

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

Hot reload is enabled -- any changes you make to the source code will be reflected in the browser immediately without a manual restart.

---

## Option B: Everything Without Docker

If you prefer not to use Docker at all, you can run ChromaDB directly via Python.

### 1. Install and Run ChromaDB

```bash
pip install chromadb
```

Then start the ChromaDB server:

```bash
chroma run --host 0.0.0.0 --port 8000
```

> **Note:** By default, ChromaDB stores data in memory. Data will be lost when you stop the process. To enable persistence, consult the [ChromaDB documentation](https://docs.trychroma.com/) for persistence configuration options.

### 2. Clone, Configure, and Run the Next.js App

Follow the same steps as Option A, starting from [Clone the Repository](#2-clone-the-repository):

```bash
git clone https://github.com/your-org/Repo-Ninja.git
cd Repo-Ninja
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)
cd src
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All environment variables are defined in `.env.local` at the project root. Use `.env.example` as a starting point.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_CLIENT_ID` | Yes | -- | Client ID from your GitHub OAuth App registration. |
| `GITHUB_CLIENT_SECRET` | Yes | -- | Client secret from your GitHub OAuth App registration. |
| `NEXTAUTH_SECRET` | Yes | -- | A random base64 string used to encrypt session tokens. **Must be generated**, not left as plain text. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | The canonical URL of your application. Set to `http://localhost:3000` for local development. |
| `CHROMADB_URL` | Yes | `http://localhost:8000` | The URL where the ChromaDB server is running. |

---

## Development Workflow

All commands below should be run from the `src/` directory.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Create an optimized production build. |
| `npm run lint` | Run ESLint across the codebase. |
| `npx jest --verbose` | Run the unit test suite with detailed output. |

A typical workflow looks like this:

```bash
cd src

# Start the dev server
npm run dev

# In another terminal, run tests as you work
npx jest --verbose

# Before committing, check for lint issues
npm run lint
```

---

## Troubleshooting

### Node.js version is too old

If you see errors about unsupported syntax or missing APIs, check your Node.js version:

```bash
node --version
```

Repo-Ninja requires Node.js 20 or later. If you are on an older version, download the latest LTS release from [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 20
nvm use 20
```

### npm install fails

1. Delete `node_modules` and the lockfile, then retry:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Make sure you are running the install from the `src/` directory, not the repository root.

3. If you see permission errors on macOS or Linux, do **not** use `sudo`. Instead, fix npm's default directory permissions. See the [npm docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally) for guidance.

### ChromaDB connection refused

If the application cannot reach ChromaDB (connection refused on port 8000):

1. **Docker (Option A):** Check that the container is running:

   ```bash
   docker ps
   ```

   If the `chromadb` container is not listed, start it:

   ```bash
   docker start chromadb
   ```

   Or recreate it:

   ```bash
   docker run -d -p 8000:8000 --name chromadb chromadb/chroma:latest
   ```

2. **Native (Option B):** Make sure the `chroma run` process is still active in its terminal. Restart it if necessary:

   ```bash
   chroma run --host 0.0.0.0 --port 8000
   ```

3. Verify the `CHROMADB_URL` value in `.env.local` matches the host and port where ChromaDB is running.

### GitHub OAuth errors

- **"OAuth App not found" or redirect mismatch:** Make sure the **Authorization callback URL** in your GitHub OAuth App settings is exactly `http://localhost:3000/api/auth/callback/github`.
- **Invalid client ID or secret:** Double-check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local` match the values from your GitHub OAuth App. There should be no extra spaces or quotes around the values.
- **"NEXTAUTH_SECRET is not set":** Generate and set the secret as described in the [Environment Variables](#environment-variables) section. The application will not start correctly without it.

### Port conflicts

If port 3000 or 8000 is already in use:

1. Find the process using the port:

   ```bash
   # On macOS / Linux
   lsof -i :3000
   # On Windows (PowerShell)
   netstat -ano | findstr :3000
   ```

2. Stop the conflicting process, or run the Next.js dev server on a different port:

   ```bash
   npx next dev --port 3001
   ```

   If you change the Next.js port, update `NEXTAUTH_URL` in `.env.local` to match (e.g., `http://localhost:3001`) and update your GitHub OAuth App callback URL accordingly.

3. For ChromaDB port conflicts, choose a different port when starting the container or process and update `CHROMADB_URL` in `.env.local` to match.
