# Repo-Ninja Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based command center that delegates development tasks (scaffolding, code review, issue solving, code writing, best practices audits) to GitHub Copilot agents, grounded in a customizable knowledge base with semantic search.

**Architecture:** Monolith Next.js 14 App Router with API routes for all backend logic. ChromaDB runs as a Docker sidecar for semantic search over knowledge base documents. GitHub Copilot SDK (`@github/copilot-sdk`) orchestrates all agent tasks. Octokit handles GitHub API operations.

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS, Shadcn UI, NextAuth.js (GitHub OAuth), @github/copilot-sdk, Octokit, ChromaDB (Docker + JS client), @react-pdf/renderer, Docker Compose

---

## Phase 1: Project Scaffold & Infrastructure

### Task 1: Initialize Next.js Project

**Files:**
- Create: `src/package.json`
- Create: `src/tsconfig.json`
- Create: `src/next.config.js`
- Create: `src/tailwind.config.ts`
- Create: `src/postcss.config.js`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1: Initialize Next.js with TypeScript and Tailwind**

```bash
cd src
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Note: We run this inside the `src/` directory. The `--src-dir=false` flag means files go directly in `src/app/`, `src/components/`, etc. (Next.js puts them at root of the project, which IS our `src/` folder).

**Step 2: Verify the app runs**

```bash
cd src && npm run dev
```

Expected: App running on http://localhost:3000 with default Next.js page.

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: initialize Next.js 14 project with TypeScript and Tailwind"
```

---

### Task 2: Install Core Dependencies

**Files:**
- Modify: `src/package.json`

**Step 1: Install production dependencies**

```bash
cd src
npm install @github/copilot-sdk octokit next-auth @auth/core chromadb @react-pdf/renderer lucide-react class-variance-authority clsx tailwind-merge zod nanoid
```

**Step 2: Install dev dependencies**

```bash
cd src
npm install -D @types/node @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom ts-jest
```

**Step 3: Verify install succeeded**

```bash
cd src && npm ls @github/copilot-sdk octokit next-auth chromadb
```

Expected: All packages listed without errors.

**Step 4: Commit**

```bash
git add src/package.json src/package-lock.json
git commit -m "feat: install core dependencies (copilot-sdk, octokit, next-auth, chromadb)"
```

---

### Task 3: Set Up Shadcn UI

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/sheet.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/toaster.tsx`
- Create: `src/lib/utils.ts`
- Modify: `src/tailwind.config.ts`
- Modify: `src/app/globals.css`

**Step 1: Initialize Shadcn UI**

```bash
cd src
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: Add required components**

```bash
cd src
npx shadcn@latest add button card input textarea select dialog table tabs badge checkbox dropdown-menu sheet toast
```

**Step 3: Verify a component exists**

```bash
ls src/components/ui/button.tsx
```

Expected: File exists.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: set up Shadcn UI with core components"
```

---

### Task 4: Docker Compose & Environment Configuration

**Files:**
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.env.example`
- Create: `src/config/env.ts`
- Create: `.gitignore` (update if exists)

**Step 1: Create `.env.example`**

```env
# GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret

# GitHub Copilot SDK (PAT with "Copilot Requests" permission)
COPILOT_GITHUB_TOKEN=your-github-pat

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# ChromaDB
CHROMADB_URL=http://localhost:8000

# Optional: OpenAI for embeddings (if not using Copilot SDK built-in)
OPENAI_API_KEY=your-openai-api-key
```

**Step 2: Create `src/config/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  COPILOT_GITHUB_TOKEN: z.string().min(1),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1),
  CHROMADB_URL: z.string().url().default("http://localhost:8000"),
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

**Step 3: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY src/package.json src/package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

**Step 4: Create `docker-compose.yml`**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file: .env.local
    depends_on:
      chromadb:
        condition: service_healthy
    environment:
      - CHROMADB_URL=http://chromadb:8000

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  chroma-data:
```

**Step 5: Update `src/next.config.js` for standalone output**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

**Step 6: Commit**

```bash
git add docker-compose.yml Dockerfile .env.example src/config/env.ts src/next.config.js .gitignore
git commit -m "feat: add Docker Compose, Dockerfile, and environment configuration"
```

---

### Task 5: GitHub OAuth with NextAuth.js

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/components/layout/session-provider.tsx`

**Step 1: Create auth configuration**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo read:user read:org",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
};
```

**Step 2: Create API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Step 3: Create session provider wrapper**

Create `src/components/layout/session-provider.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Step 4: Update root layout**

Modify `src/app/layout.tsx` to wrap with `AuthSessionProvider`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/layout/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Repo-Ninja",
  description: "AI-powered command center for GitHub development workflows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
```

**Step 5: Verify build succeeds**

```bash
cd src && npm run build
```

Expected: Build completes without errors.

**Step 6: Commit**

```bash
git add src/app/api/auth/ src/lib/auth.ts src/components/layout/session-provider.tsx src/app/layout.tsx
git commit -m "feat: add GitHub OAuth authentication with NextAuth.js"
```

---

### Task 6: Health Check API Route

**Files:**
- Create: `src/app/api/health/route.ts`

**Step 1: Create health check route**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const chromadbUrl = process.env.CHROMADB_URL || "http://localhost:8000";
  let chromadbStatus = "unknown";

  try {
    const res = await fetch(`${chromadbUrl}/api/v1/heartbeat`, { signal: AbortSignal.timeout(3000) });
    chromadbStatus = res.ok ? "connected" : "error";
  } catch {
    chromadbStatus = "disconnected";
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      chromadb: chromadbStatus,
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add health check API route with ChromaDB status"
```

---

## Phase 2: Core Library Layer

### Task 7: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Create shared types**

Create `src/lib/types.ts`:

```typescript
// === Knowledge Base Types ===

export interface KnowledgeDocument {
  id: string;
  filename: string;
  category: KnowledgeCategory;
  content: string;
  metadata: DocMetadata;
}

export type KnowledgeCategory =
  | "best-practices"
  | "scaffolding"
  | "review-instructions"
  | "agent-instructions"
  | "architecture-patterns"
  | "ci-cd"
  | "responsible-ai";

export interface DocMetadata {
  category: KnowledgeCategory;
  filename: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

export interface KnowledgeResult {
  id: string;
  content: string;
  metadata: DocMetadata;
  score: number;
}

// === KnowledgeStore Interface (Azure upgrade path) ===

export interface KnowledgeStore {
  search(query: string, topK: number): Promise<KnowledgeResult[]>;
  upsert(docId: string, content: string, metadata: DocMetadata): Promise<void>;
  delete(docId: string): Promise<void>;
  reindexAll(): Promise<void>;
  getStatus(): Promise<{ connected: boolean; documentCount: number }>;
}

// === Agent Types ===

export type AgentTaskType = "issue-solver" | "code-writer" | "code-review" | "best-practices-audit";

export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  repo: string;
  description: string;
  branch?: string;
  prUrl?: string;
  progress: string[];
  createdAt: string;
  updatedAt: string;
  result?: AgentTaskResult;
}

export interface AgentTaskResult {
  summary: string;
  prUrl?: string;
  reportUrl?: string;
}

// === Scaffold Types ===

export interface ScaffoldRequest {
  mode: "natural-language" | "guided";
  description?: string;
  options?: GuidedScaffoldOptions;
}

export interface GuidedScaffoldOptions {
  framework: string;
  language: string;
  auth: string;
  database: string;
  styling: string;
  cicd: string;
}

export interface ScaffoldPlan {
  repoName: string;
  description: string;
  structure: ScaffoldFile[];
  bestPracticesApplied: string[];
  knowledgeSources: string[];
}

export interface ScaffoldFile {
  path: string;
  description: string;
  content?: string;
}

// === Review Types ===

export type ReviewType = "security" | "performance" | "accessibility" | "general" | "custom";

export type ReviewScope = "full-repo" | "pr" | "files";

export interface ReviewRequest {
  repo: string;
  reviewTypes: ReviewType[];
  scope: ReviewScope;
  prNumber?: number;
  filePattern?: string;
}

export interface ReviewReport {
  id: string;
  repo: string;
  reviewTypes: ReviewType[];
  overallScore: number;
  categoryScores: CategoryScore[];
  findings: ReviewFinding[];
  createdAt: string;
}

export interface CategoryScore {
  category: ReviewType;
  score: number;
  maxScore: number;
  issueCount: number;
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export interface ReviewFinding {
  severity: FindingSeverity;
  category: ReviewType;
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

// === Best Practices Audit Types ===

export interface AuditReport {
  id: string;
  repo: string;
  complianceScore: number;
  checks: AuditCheck[];
  recommendations: string[];
  createdAt: string;
}

export interface AuditCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  description: string;
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for knowledge base, agents, scaffold, and reviews"
```

---

### Task 8: ChromaDB Client (KnowledgeStore Implementation)

**Files:**
- Create: `src/lib/chromadb/client.ts`
- Create: `src/lib/chromadb/chromadb-store.ts`
- Create: `src/lib/chromadb/chunker.ts`

**Step 1: Create ChromaDB client wrapper**

Create `src/lib/chromadb/client.ts`:

```typescript
import { ChromaClient } from "chromadb";

let client: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!client) {
    const url = process.env.CHROMADB_URL || "http://localhost:8000";
    client = new ChromaClient({ path: url });
  }
  return client;
}

export const COLLECTION_NAME = "repo-ninja-knowledge";
```

**Step 2: Create markdown chunker**

Create `src/lib/chromadb/chunker.ts`:

```typescript
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    filename: string;
    category: string;
    section: string;
    chunkIndex: number;
  };
}

export function chunkMarkdown(
  filename: string,
  category: string,
  content: string
): DocumentChunk[] {
  const sections = content.split(/^## /m);
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    const sectionTitle = i === 0 ? "intro" : section.split("\n")[0].trim();
    const sectionContent = i === 0 ? section : `## ${section}`;

    chunks.push({
      id: `${filename}::chunk-${i}`,
      content: sectionContent,
      metadata: {
        filename,
        category,
        section: sectionTitle,
        chunkIndex: i,
      },
    });
  }

  return chunks;
}
```

**Step 3: Create ChromaDBStore implementing KnowledgeStore**

Create `src/lib/chromadb/chromadb-store.ts`:

```typescript
import { getChromaClient, COLLECTION_NAME } from "./client";
import { chunkMarkdown } from "./chunker";
import type { KnowledgeStore, KnowledgeResult, DocMetadata } from "@/lib/types";

export class ChromaDBStore implements KnowledgeStore {
  async search(query: string, topK: number): Promise<KnowledgeResult[]> {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

    const results = await collection.query({
      queryTexts: [query],
      nResults: topK,
    });

    if (!results.ids[0]) return [];

    return results.ids[0].map((id, i) => ({
      id,
      content: results.documents[0]?.[i] || "",
      metadata: (results.metadatas[0]?.[i] as unknown as DocMetadata) || {
        category: "best-practices",
        filename: "",
        title: "",
        tags: [],
        updatedAt: "",
      },
      score: results.distances?.[0]?.[i] ?? 0,
    }));
  }

  async upsert(docId: string, content: string, metadata: DocMetadata): Promise<void> {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

    const chunks = chunkMarkdown(metadata.filename, metadata.category, content);

    // Delete existing chunks for this document
    try {
      const existing = await collection.get({
        where: { filename: metadata.filename },
      });
      if (existing.ids.length > 0) {
        await collection.delete({ ids: existing.ids });
      }
    } catch {
      // Collection may be empty, ignore
    }

    // Add new chunks
    await collection.add({
      ids: chunks.map((c) => c.id),
      documents: chunks.map((c) => c.content),
      metadatas: chunks.map((c) => ({
        ...c.metadata,
        ...metadata,
        section: c.metadata.section,
        chunkIndex: c.metadata.chunkIndex,
      })),
    });
  }

  async delete(docId: string): Promise<void> {
    const client = getChromaClient();
    const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

    const existing = await collection.get({
      where: { filename: docId },
    });
    if (existing.ids.length > 0) {
      await collection.delete({ ids: existing.ids });
    }
  }

  async reindexAll(): Promise<void> {
    const client = getChromaClient();
    // Delete and recreate collection
    try {
      await client.deleteCollection({ name: COLLECTION_NAME });
    } catch {
      // May not exist
    }
    await client.getOrCreateCollection({ name: COLLECTION_NAME });
  }

  async getStatus(): Promise<{ connected: boolean; documentCount: number }> {
    try {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
      const count = await collection.count();
      return { connected: true, documentCount: count };
    } catch {
      return { connected: false, documentCount: 0 };
    }
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/chromadb/
git commit -m "feat: add ChromaDB knowledge store with markdown chunking"
```

---

### Task 9: GitHub Copilot SDK Wrapper

**Files:**
- Create: `src/lib/copilot-sdk/client.ts`
- Create: `src/lib/copilot-sdk/prompts.ts`

**Step 1: Create Copilot SDK client wrapper**

Create `src/lib/copilot-sdk/client.ts`:

```typescript
import { CopilotClient } from "@github/copilot-sdk";

let client: CopilotClient | null = null;

export function getCopilotClient(): CopilotClient {
  if (!client) {
    client = new CopilotClient();
  }
  return client;
}

export async function askCopilot(prompt: string): Promise<string> {
  const copilot = getCopilotClient();
  const session = await copilot.createSession({ model: "gpt-4.1" });

  const response = await session.sendAndWait({ prompt });
  return response?.data.content || "";
}

export async function streamCopilot(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const copilot = getCopilotClient();
  const session = await copilot.createSession({ model: "gpt-4.1" });

  let fullResponse = "";

  session.on("response", (chunk: any) => {
    const text = chunk?.data?.content || "";
    fullResponse += text;
    onChunk(text);
  });

  await session.send({ prompt });
  return fullResponse;
}
```

**Step 2: Create prompt templates**

Create `src/lib/copilot-sdk/prompts.ts`:

```typescript
import type { KnowledgeResult, ReviewType } from "@/lib/types";

export function buildScaffoldPrompt(
  userDescription: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert at scaffolding new GitHub repositories following best practices.

Based on the following best practices and standards:

${context}

The user wants to create a new repository:
"${userDescription}"

Generate a scaffold plan as JSON with this structure:
{
  "repoName": "suggested-repo-name",
  "description": "Short description",
  "structure": [
    { "path": "src/app/page.tsx", "description": "Main page component" }
  ],
  "bestPracticesApplied": ["TypeScript strict mode", "ESLint config"],
  "knowledgeSources": ["react-nextjs.md", "security.md"]
}

Be specific about file paths and what each file contains. Follow the patterns from the knowledge base documents.`;
}

export function buildReviewPrompt(
  code: string,
  reviewTypes: ReviewType[],
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert code reviewer. Review the following code against these standards:

${context}

Review types requested: ${reviewTypes.join(", ")}

Code to review:
\`\`\`
${code}
\`\`\`

Respond as JSON:
{
  "overallScore": 7.8,
  "categoryScores": [
    { "category": "security", "score": 8, "maxScore": 10, "issueCount": 2 }
  ],
  "findings": [
    {
      "severity": "high",
      "category": "security",
      "title": "SQL injection risk",
      "description": "User input is passed directly to query",
      "file": "src/lib/db.ts",
      "line": 45,
      "suggestion": "Use parameterized queries"
    }
  ]
}`;
}

export function buildIssueSolverPrompt(
  issueTitle: string,
  issueBody: string,
  repoContext: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert developer. Solve the following GitHub issue following these standards:

${context}

Issue: ${issueTitle}
${issueBody}

Repository context:
${repoContext}

Generate the code changes needed to solve this issue. For each file, provide the complete updated content.
Respond as JSON:
{
  "summary": "Brief description of changes",
  "files": [
    { "path": "src/lib/auth.ts", "action": "modify", "content": "full file content..." }
  ],
  "commitMessage": "fix: resolve login redirect issue (#15)"
}`;
}

export function buildAuditPrompt(
  repoStructure: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, a best practices auditor. Check the following repository against these standards:

${context}

Repository structure and key files:
${repoStructure}

Respond as JSON:
{
  "complianceScore": 72,
  "checks": [
    { "name": "TypeScript strict mode", "status": "pass", "description": "tsconfig.json has strict: true" },
    { "name": "CI/CD pipeline", "status": "fail", "description": "No GitHub Actions workflow found" }
  ],
  "recommendations": [
    "Add a GitHub Actions workflow for CI/CD",
    "Add unit tests for core functionality"
  ]
}`;
}
```

**Step 3: Commit**

```bash
git add src/lib/copilot-sdk/
git commit -m "feat: add Copilot SDK wrapper and prompt templates"
```

---

### Task 10: Octokit GitHub API Helper

**Files:**
- Create: `src/lib/github/octokit.ts`

**Step 1: Create Octokit helper**

Create `src/lib/github/octokit.ts`:

```typescript
import { Octokit } from "octokit";

export function getOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function listUserRepos(octokit: Octokit) {
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 50,
  });
  return data.map((repo) => ({
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
  }));
}

export async function listRepoIssues(octokit: Octokit, owner: string, repo: string) {
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: "open",
    per_page: 50,
  });
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || "",
      labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
      createdAt: issue.created_at,
    }));
}

export async function getRepoTree(octokit: Octokit, owner: string, repo: string, branch: string) {
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });
  return data.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path || "");
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
) {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });
  if ("content" in data) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return "";
}

export async function createRepo(
  octokit: Octokit,
  name: string,
  description: string,
  isPrivate: boolean
) {
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: true,
  });
  return {
    fullName: data.full_name,
    htmlUrl: data.html_url,
    defaultBranch: data.default_branch,
    owner: data.owner.login,
  };
}

export async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string
) {
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });
}

export async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string
) {
  for (const file of files) {
    // Check if file exists to get its SHA
    let sha: string | undefined;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: branch,
      });
      if ("sha" in data) {
        sha = data.sha;
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file.path,
      message,
      content: Buffer.from(file.content).toString("base64"),
      branch,
      sha,
    });
  }
}

export async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
) {
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    title,
    body,
    head,
    base,
  });
  return { number: data.number, htmlUrl: data.html_url };
}
```

**Step 2: Commit**

```bash
git add src/lib/github/
git commit -m "feat: add Octokit GitHub API helper functions"
```

---

### Task 11: Agent Task State Management

**Files:**
- Create: `src/lib/agent-store.ts`

**Step 1: Create in-memory + JSON file agent task store**

Create `src/lib/agent-store.ts`:

```typescript
import { readFileSync, writeFileSync, existsSync } from "fs";
import { nanoid } from "nanoid";
import type { AgentTask, AgentTaskType, AgentTaskStatus, AgentTaskResult } from "@/lib/types";

const STORE_PATH = process.env.AGENT_STORE_PATH || "/tmp/repo-ninja-agents.json";

function loadTasks(): AgentTask[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveTasks(tasks: AgentTask[]): void {
  writeFileSync(STORE_PATH, JSON.stringify(tasks, null, 2));
}

export function createTask(
  type: AgentTaskType,
  repo: string,
  description: string
): AgentTask {
  const tasks = loadTasks();
  const task: AgentTask = {
    id: nanoid(),
    type,
    status: "queued",
    repo,
    description,
    progress: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(
  id: string,
  updates: Partial<Pick<AgentTask, "status" | "branch" | "prUrl" | "result">> & {
    progressMessage?: string;
  }
): AgentTask | null {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;

  if (updates.status) task.status = updates.status;
  if (updates.branch) task.branch = updates.branch;
  if (updates.prUrl) task.prUrl = updates.prUrl;
  if (updates.result) task.result = updates.result;
  if (updates.progressMessage) task.progress.push(updates.progressMessage);
  task.updatedAt = new Date().toISOString();

  saveTasks(tasks);
  return task;
}

export function getTask(id: string): AgentTask | null {
  return loadTasks().find((t) => t.id === id) || null;
}

export function listTasks(filter?: {
  type?: AgentTaskType;
  status?: AgentTaskStatus;
}): AgentTask[] {
  let tasks = loadTasks();
  if (filter?.type) tasks = tasks.filter((t) => t.type === filter.type);
  if (filter?.status) tasks = tasks.filter((t) => t.status === filter.status);
  return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
```

**Step 2: Commit**

```bash
git add src/lib/agent-store.ts
git commit -m "feat: add agent task state management (JSON file store)"
```

---

## Phase 3: UI Shell & Layout

### Task 12: App Layout with Header & Sidebar

**Files:**
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/nav-item.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Create header component**

Create `src/components/layout/header.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, LogIn } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/" className="font-bold text-lg">
          Repo-Ninja
        </Link>
        <div className="flex-1" />
        {session ? (
          <>
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button onClick={() => signIn("github")}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with GitHub
          </Button>
        )}
      </div>
    </header>
  );
}
```

**Step 2: Create sidebar navigation**

Create `src/components/layout/sidebar.tsx`:

```typescript
"use client";

import { usePathname } from "next/navigation";
import { NavItem } from "./nav-item";
import { LayoutDashboard, Hammer, Bot, FileSearch, BookOpen } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scaffold", label: "Scaffold", icon: Hammer },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/reviews", label: "Reviews", icon: FileSearch },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-background min-h-[calc(100vh-3.5rem)]">
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
          />
        ))}
      </nav>
    </aside>
  );
}
```

**Step 3: Create nav item component**

Create `src/components/layout/nav-item.tsx`:

```typescript
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

export function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
```

**Step 4: Update root layout to include header and sidebar**

Modify `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Repo-Ninja",
  description: "AI-powered command center for GitHub development workflows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
```

**Step 5: Verify the app renders with layout**

```bash
cd src && npm run dev
```

Expected: App shows header with "Repo-Ninja" title, sidebar with 5 nav items, and main content area.

**Step 6: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add app shell with header and sidebar navigation"
```

---

### Task 13: Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/shared/status-badge.tsx`

**Step 1: Create status badge component**

Create `src/components/shared/status-badge.tsx`:

```typescript
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentTaskStatus } from "@/lib/types";

const statusStyles: Record<AgentTaskStatus, string> = {
  queued: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-700",
};

export function StatusBadge({ status }: { status: AgentTaskStatus }) {
  return (
    <Badge className={cn("capitalize", statusStyles[status])} variant="outline">
      {status}
    </Badge>
  );
}
```

**Step 2: Build dashboard page**

Modify `src/app/page.tsx`:

```typescript
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Hammer, FileSearch, ShieldCheck, Github } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentTask } from "@/lib/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  useEffect(() => {
    fetch("/api/agents/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Github className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Welcome to Repo-Ninja</h1>
        <p className="text-muted-foreground">
          Sign in with GitHub to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Connected as {session.user?.name || session.user?.email}
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/scaffold">
          <Button>
            <Hammer className="h-4 w-4 mr-2" />
            Scaffold New Repo
          </Button>
        </Link>
        <Link href="/reviews">
          <Button variant="outline">
            <FileSearch className="h-4 w-4 mr-2" />
            Start Code Review
          </Button>
        </Link>
        <Link href="/reviews?tab=audit">
          <Button variant="outline">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Run Audit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active agent tasks.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Repo</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.slice(0, 10).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="capitalize">{task.type.replace("-", " ")}</TableCell>
                    <TableCell>{task.repo}</TableCell>
                    <TableCell className="max-w-xs truncate">{task.description}</TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/components/shared/
git commit -m "feat: add dashboard page with active agents table"
```

---

## Phase 4: Knowledge Base Feature

### Task 14: Knowledge Base API Routes

**Files:**
- Create: `src/app/api/knowledge/route.ts` (list, create)
- Create: `src/app/api/knowledge/[filename]/route.ts` (get, update, delete)
- Create: `src/app/api/knowledge/reindex/route.ts`
- Create: `src/app/api/knowledge/status/route.ts`

**Step 1: Create list + create route**

Create `src/app/api/knowledge/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import type { KnowledgeCategory, KnowledgeDocument, DocMetadata } from "@/lib/types";

const KNOWLEDGE_BASE_PATH = join(process.cwd(), "knowledge-base");

const CATEGORY_DIRS: Record<string, KnowledgeCategory> = {
  "best-practices": "best-practices",
  "scaffolding": "scaffolding",
  "review-instructions": "review-instructions",
  "agent-instructions": "agent-instructions",
  "architecture-patterns": "architecture-patterns",
  "ci-cd": "ci-cd",
  "responsible-ai": "responsible-ai",
};

function scanKnowledgeBase(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];
  for (const [dir, category] of Object.entries(CATEGORY_DIRS)) {
    const dirPath = join(KNOWLEDGE_BASE_PATH, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, "utf-8");
      const stat = statSync(filePath);
      const title = content.split("\n")[0]?.replace(/^#\s*/, "") || file;

      docs.push({
        id: `${category}/${file}`,
        filename: file,
        category,
        content,
        metadata: {
          category,
          filename: file,
          title,
          tags: [],
          updatedAt: stat.mtime.toISOString(),
        },
      });
    }
  }
  return docs;
}

export async function GET() {
  const docs = scanKnowledgeBase();
  return NextResponse.json({ documents: docs.map(({ content, ...rest }) => rest) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { filename, category, content } = body as {
    filename: string;
    category: KnowledgeCategory;
    content: string;
  };

  if (!filename || !category || !content) {
    return NextResponse.json({ error: "filename, category, and content are required" }, { status: 400 });
  }

  const dirPath = join(KNOWLEDGE_BASE_PATH, category);
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

  const filePath = join(dirPath, filename.endsWith(".md") ? filename : `${filename}.md`);
  writeFileSync(filePath, content, "utf-8");

  // Index in ChromaDB
  const store = new ChromaDBStore();
  const title = content.split("\n")[0]?.replace(/^#\s*/, "") || filename;
  await store.upsert(filename, content, {
    category,
    filename,
    title,
    tags: [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, id: `${category}/${filename}` });
}
```

**Step 2: Create single document route**

Create `src/app/api/knowledge/[filename]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

const KNOWLEDGE_BASE_PATH = join(process.cwd(), "knowledge-base");

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  // Search across all category dirs
  const categories = ["best-practices", "scaffolding", "review-instructions", "agent-instructions", "architecture-patterns", "ci-cd", "responsible-ai"];

  for (const category of categories) {
    const filePath = join(KNOWLEDGE_BASE_PATH, category, filename);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      return NextResponse.json({ filename, category, content });
    }
  }

  return NextResponse.json({ error: "Document not found" }, { status: 404 });
}

export async function PUT(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  const { category, content } = await request.json();

  const filePath = join(KNOWLEDGE_BASE_PATH, category, filename);
  if (!existsSync(join(KNOWLEDGE_BASE_PATH, category))) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  writeFileSync(filePath, content, "utf-8");

  const store = new ChromaDBStore();
  const title = content.split("\n")[0]?.replace(/^#\s*/, "") || filename;
  await store.upsert(filename, content, {
    category,
    filename,
    title,
    tags: [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  const categories = ["best-practices", "scaffolding", "review-instructions", "agent-instructions", "architecture-patterns", "ci-cd", "responsible-ai"];

  for (const category of categories) {
    const filePath = join(KNOWLEDGE_BASE_PATH, category, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      const store = new ChromaDBStore();
      await store.delete(filename);
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: "Document not found" }, { status: 404 });
}
```

**Step 3: Create reindex route**

Create `src/app/api/knowledge/reindex/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

const KNOWLEDGE_BASE_PATH = join(process.cwd(), "knowledge-base");

export async function POST() {
  const store = new ChromaDBStore();
  await store.reindexAll();

  const categories = ["best-practices", "scaffolding", "review-instructions", "agent-instructions", "architecture-patterns", "ci-cd", "responsible-ai"];
  let indexed = 0;

  for (const category of categories) {
    const dirPath = join(KNOWLEDGE_BASE_PATH, category);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = readFileSync(join(dirPath, file), "utf-8");
      const title = content.split("\n")[0]?.replace(/^#\s*/, "") || file;

      await store.upsert(file, content, {
        category: category as any,
        filename: file,
        title,
        tags: [],
        updatedAt: new Date().toISOString(),
      });
      indexed++;
    }
  }

  return NextResponse.json({ success: true, indexed });
}
```

**Step 4: Create status route**

Create `src/app/api/knowledge/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

export async function GET() {
  const store = new ChromaDBStore();
  const status = await store.getStatus();
  return NextResponse.json(status);
}
```

**Step 5: Commit**

```bash
git add src/app/api/knowledge/
git commit -m "feat: add knowledge base API routes (CRUD, reindex, status)"
```

---

### Task 15: Knowledge Base UI Page

**Files:**
- Create: `src/app/knowledge/page.tsx`
- Create: `src/components/knowledge/document-list.tsx`
- Create: `src/components/knowledge/document-editor.tsx`
- Create: `src/hooks/use-knowledge.ts`

**Step 1: Create knowledge base hook**

Create `src/hooks/use-knowledge.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { KnowledgeDocument, KnowledgeCategory } from "@/lib/types";

export function useKnowledge() {
  const [documents, setDocuments] = useState<Omit<KnowledgeDocument, "content">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{ connected: boolean; documentCount: number }>({
    connected: false,
    documentCount: 0,
  });

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, documentCount: 0 });
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStatus();
  }, [fetchDocuments, fetchStatus]);

  const getDocument = async (filename: string): Promise<{ filename: string; category: string; content: string } | null> => {
    const res = await fetch(`/api/knowledge/${encodeURIComponent(filename)}`);
    if (!res.ok) return null;
    return res.json();
  };

  const saveDocument = async (filename: string, category: KnowledgeCategory, content: string) => {
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, category, content }),
    });
    if (res.ok) {
      await fetchDocuments();
      await fetchStatus();
    }
    return res.ok;
  };

  const updateDocument = async (filename: string, category: KnowledgeCategory, content: string) => {
    const res = await fetch(`/api/knowledge/${encodeURIComponent(filename)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, content }),
    });
    if (res.ok) {
      await fetchDocuments();
      await fetchStatus();
    }
    return res.ok;
  };

  const deleteDocument = async (filename: string) => {
    const res = await fetch(`/api/knowledge/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchDocuments();
      await fetchStatus();
    }
    return res.ok;
  };

  const reindexAll = async () => {
    const res = await fetch("/api/knowledge/reindex", { method: "POST" });
    if (res.ok) await fetchStatus();
    return res.ok;
  };

  return {
    documents,
    isLoading,
    status,
    getDocument,
    saveDocument,
    updateDocument,
    deleteDocument,
    reindexAll,
    refresh: fetchDocuments,
  };
}
```

**Step 2: Create document list component**

Create `src/components/knowledge/document-list.tsx`:

```typescript
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { KnowledgeDocument } from "@/lib/types";

interface DocumentListProps {
  documents: Omit<KnowledgeDocument, "content">[];
  onEdit: (filename: string) => void;
  onDelete: (filename: string) => void;
  categoryFilter: string;
}

export function DocumentList({ documents, onEdit, onDelete, categoryFilter }: DocumentListProps) {
  const filtered = categoryFilter === "all"
    ? documents
    : documents.filter((d) => d.category === categoryFilter);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">{doc.filename}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {doc.category.replace("-", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {doc.metadata.updatedAt ? new Date(doc.metadata.updatedAt).toLocaleDateString() : "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(doc.filename)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(doc.filename)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {filtered.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No documents found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

**Step 3: Create document editor component**

Create `src/components/knowledge/document-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeCategory } from "@/lib/types";

const CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "best-practices", label: "Best Practices" },
  { value: "scaffolding", label: "Scaffolding" },
  { value: "review-instructions", label: "Review Instructions" },
  { value: "agent-instructions", label: "Agent Instructions" },
  { value: "architecture-patterns", label: "Architecture Patterns" },
  { value: "ci-cd", label: "CI/CD" },
  { value: "responsible-ai", label: "Responsible AI" },
];

interface DocumentEditorProps {
  filename?: string;
  initialCategory?: KnowledgeCategory;
  initialContent?: string;
  isNew: boolean;
  onSave: (filename: string, category: KnowledgeCategory, content: string) => Promise<boolean>;
  onCancel: () => void;
}

export function DocumentEditor({
  filename: initialFilename,
  initialCategory,
  initialContent,
  isNew,
  onSave,
  onCancel,
}: DocumentEditorProps) {
  const [filename, setFilename] = useState(initialFilename || "");
  const [category, setCategory] = useState<KnowledgeCategory>(initialCategory || "best-practices");
  const [content, setContent] = useState(initialContent || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(filename, category, content);
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isNew ? "Add Document" : `Edit: ${filename}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Filename</label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={!isNew}
              placeholder="my-best-practices.md"
            />
          </div>
          <div className="w-48">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as KnowledgeCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Content (Markdown)</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            placeholder="# Title&#10;&#10;Write your best practices here..."
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !filename || !content}>
            {saving ? "Saving & Indexing..." : "Save & Re-index"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Build knowledge base page**

Create `src/app/knowledge/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Database } from "lucide-react";
import { useKnowledge } from "@/hooks/use-knowledge";
import { DocumentList } from "@/components/knowledge/document-list";
import { DocumentEditor } from "@/components/knowledge/document-editor";
import type { KnowledgeCategory } from "@/lib/types";

export default function KnowledgePage() {
  const {
    documents,
    isLoading,
    status,
    getDocument,
    saveDocument,
    updateDocument,
    deleteDocument,
    reindexAll,
  } = useKnowledge();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<{
    filename?: string;
    category?: KnowledgeCategory;
    content?: string;
    isNew: boolean;
  } | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const handleEdit = async (filename: string) => {
    const doc = await getDocument(filename);
    if (doc) {
      setEditing({
        filename: doc.filename,
        category: doc.category as KnowledgeCategory,
        content: doc.content,
        isNew: false,
      });
    }
  };

  const handleDelete = async (filename: string) => {
    if (confirm(`Delete ${filename}?`)) {
      await deleteDocument(filename);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    await reindexAll();
    setReindexing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <Button onClick={() => setEditing({ isNew: true })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="best-practices">Best Practices</SelectItem>
            <SelectItem value="scaffolding">Scaffolding</SelectItem>
            <SelectItem value="review-instructions">Review Instructions</SelectItem>
            <SelectItem value="agent-instructions">Agent Instructions</SelectItem>
            <SelectItem value="architecture-patterns">Architecture Patterns</SelectItem>
            <SelectItem value="ci-cd">CI/CD</SelectItem>
            <SelectItem value="responsible-ai">Responsible AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {editing ? (
        <DocumentEditor
          filename={editing.filename}
          initialCategory={editing.category}
          initialContent={editing.content}
          isNew={editing.isNew}
          onSave={editing.isNew ? saveDocument : updateDocument}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DocumentList
              documents={documents}
              onEdit={handleEdit}
              onDelete={handleDelete}
              categoryFilter={categoryFilter}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          ChromaDB:
          <Badge variant={status.connected ? "default" : "destructive"}>
            {status.connected ? "Connected" : "Disconnected"}
          </Badge>
          {status.connected && (
            <span>({status.documentCount} chunks indexed)</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleReindex} disabled={reindexing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${reindexing ? "animate-spin" : ""}`} />
          {reindexing ? "Re-indexing..." : "Re-index All Documents"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 5: Verify the page renders**

```bash
cd src && npm run dev
```

Navigate to http://localhost:3000/knowledge — Expected: Knowledge base page with category filter, empty document list, and ChromaDB status.

**Step 6: Commit**

```bash
git add src/app/knowledge/ src/components/knowledge/ src/hooks/use-knowledge.ts
git commit -m "feat: add knowledge base UI with document list, editor, and reindexing"
```

---

### Task 16: Seed Default Knowledge Base Documents

**Files:**
- Create: `src/knowledge-base/best-practices/react-nextjs.md`
- Create: `src/knowledge-base/best-practices/typescript.md`
- Create: `src/knowledge-base/best-practices/security.md`
- Create: `src/knowledge-base/scaffolding/react-nextjs-fullstack.md`
- Create: `src/knowledge-base/review-instructions/general-review.md`
- Create: `src/knowledge-base/review-instructions/security-review.md`
- Create: `src/knowledge-base/agent-instructions/issue-solver.md`
- Create: `src/knowledge-base/agent-instructions/code-writer.md`
- Create: `src/knowledge-base/ci-cd/github-actions.md`
- Create: `src/knowledge-base/responsible-ai/rai-checklist.md`
- Create: `src/knowledge-base/metadata.json`

**Step 1: Create each markdown file with substantive content**

Each file should be 50-150 lines of actual best practices, not placeholder text. The content serves as the grounding knowledge for all agent behavior.

Example for `src/knowledge-base/best-practices/react-nextjs.md`:

```markdown
# React/Next.js Best Practices

## Project Structure
- Use Next.js 14+ App Router (not Pages Router)
- Colocate components with their pages when page-specific
- Shared components go in `components/` at the project root
- Use `lib/` for utilities, API clients, and shared logic
- Use `hooks/` for custom React hooks

## TypeScript
- Enable strict mode in tsconfig.json
- Define interfaces for all props and API responses
- Use `type` for unions/intersections, `interface` for object shapes
- Avoid `any` — use `unknown` with type guards

## Component Patterns
- Prefer Server Components by default (no "use client" unless needed)
- Use "use client" only for: event handlers, useState/useEffect, browser APIs
- Keep client components small — extract server-renderable parts
- Use Suspense boundaries for async data loading

## Data Fetching
- Fetch data in Server Components using async/await
- Use Route Handlers (API routes) for mutations and external API calls
- Implement proper error boundaries with error.tsx files
- Use loading.tsx for streaming/suspense states

## Forms and Validation
- Use Server Actions for form mutations when possible
- Validate on both client (UX) and server (security)
- Use Zod for schema validation

## Performance
- Use next/image for all images (automatic optimization)
- Use next/font for font loading
- Implement proper metadata exports for SEO
- Use dynamic imports for heavy client components

## Error Handling
- Create error.tsx boundary files in each route segment
- Log errors server-side, show user-friendly messages client-side
- Use toast notifications for non-blocking errors
```

Create similar substantive content for each file. The content should be real, actionable best practices — not filler.

**Step 2: Create metadata.json**

```json
{
  "version": "1.0",
  "description": "Repo-Ninja default knowledge base",
  "categories": {
    "best-practices": { "label": "Best Practices", "description": "Coding standards and patterns" },
    "scaffolding": { "label": "Scaffolding", "description": "Repo templates and structure guides" },
    "review-instructions": { "label": "Review Instructions", "description": "Code review checklists" },
    "agent-instructions": { "label": "Agent Instructions", "description": "Agent behavior guidelines" },
    "architecture-patterns": { "label": "Architecture Patterns", "description": "System design guidance" },
    "ci-cd": { "label": "CI/CD", "description": "Pipeline and deployment templates" },
    "responsible-ai": { "label": "Responsible AI", "description": "RAI guidelines and safety" }
  }
}
```

**Step 3: Commit**

```bash
git add src/knowledge-base/
git commit -m "feat: seed default knowledge base with best practices, scaffolding, and review docs"
```

---

## Phase 5: Scaffold Feature

### Task 17: Scaffold API Routes

**Files:**
- Create: `src/app/api/scaffold/plan/route.ts`
- Create: `src/app/api/scaffold/create/route.ts`

**Step 1: Create scaffold plan route**

Create `src/app/api/scaffold/plan/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildScaffoldPrompt } from "@/lib/copilot-sdk/prompts";
import type { ScaffoldRequest } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as ScaffoldRequest;

  // Build search query from user input
  let searchQuery: string;
  if (body.mode === "natural-language" && body.description) {
    searchQuery = body.description;
  } else if (body.mode === "guided" && body.options) {
    searchQuery = `${body.options.framework} ${body.options.language} ${body.options.auth} ${body.options.database} ${body.options.styling} ${body.options.cicd}`;
  } else {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Search knowledge base
  const store = new ChromaDBStore();
  const knowledgeDocs = await store.search(searchQuery, 8);

  // Generate scaffold plan via Copilot SDK
  const prompt = buildScaffoldPrompt(
    body.description || searchQuery,
    knowledgeDocs
  );
  const response = await askCopilot(prompt);

  // Parse JSON from response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (!plan) throw new Error("No JSON in response");

    return NextResponse.json({ plan, knowledgeSources: knowledgeDocs.map((d) => d.metadata.filename) });
  } catch {
    return NextResponse.json({ error: "Failed to generate plan", raw: response }, { status: 500 });
  }
}
```

**Step 2: Create scaffold create route**

Create `src/app/api/scaffold/create/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOctokit, createRepo, commitFiles } from "@/lib/github/octokit";
import { askCopilot } from "@/lib/copilot-sdk/client";
import type { ScaffoldPlan } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, repoName, isPrivate } = (await request.json()) as {
    plan: ScaffoldPlan;
    repoName: string;
    isPrivate: boolean;
  };

  const accessToken = (session as any).accessToken;
  if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 });

  const octokit = getOctokit(accessToken);

  // Create the repo
  const repo = await createRepo(octokit, repoName, plan.description, isPrivate);

  // Generate file contents via Copilot SDK
  const filePrompt = `Generate the complete file contents for each file in this scaffold plan:
${JSON.stringify(plan.structure, null, 2)}

For each file, return JSON array:
[{ "path": "file/path.ts", "content": "full file content..." }]

Make the code production-ready following the best practices: ${plan.bestPracticesApplied.join(", ")}`;

  const response = await askCopilot(filePrompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  const files = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  // Commit files to repo
  if (files.length > 0) {
    await commitFiles(
      octokit,
      repo.owner,
      repoName,
      repo.defaultBranch,
      files,
      "feat: initial scaffold by Repo-Ninja"
    );
  }

  return NextResponse.json({
    success: true,
    repoUrl: repo.htmlUrl,
    filesCreated: files.length,
  });
}
```

**Step 3: Commit**

```bash
git add src/app/api/scaffold/
git commit -m "feat: add scaffold API routes (plan generation and repo creation)"
```

---

### Task 18: Scaffold UI Page

**Files:**
- Create: `src/app/scaffold/page.tsx`
- Create: `src/components/scaffold/natural-language-form.tsx`
- Create: `src/components/scaffold/guided-form.tsx`
- Create: `src/components/scaffold/scaffold-plan-view.tsx`

**Step 1: Create natural language form component**

Create `src/components/scaffold/natural-language-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface NaturalLanguageFormProps {
  onSubmit: (description: string) => void;
  isLoading: boolean;
}

export function NaturalLanguageForm({ onSubmit, isLoading }: NaturalLanguageFormProps) {
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Describe what you want to build:</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="I need a React/Next.js app with GitHub OAuth, a REST API, PostgreSQL database, and Tailwind CSS styling. It should follow enterprise security best practices."
        />
      </div>
      <Button
        onClick={() => onSubmit(description)}
        disabled={!description.trim() || isLoading}
      >
        {isLoading ? "Generating Plan..." : "Generate Scaffold Plan"}
      </Button>
    </div>
  );
}
```

**Step 2: Create guided form component**

Create `src/components/scaffold/guided-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = {
  framework: ["React/Next.js", "Python/FastAPI", "Node/Express", ".NET Web API"],
  language: ["TypeScript", "JavaScript", "Python", "C#"],
  auth: ["GitHub OAuth", "Azure AD", "JWT", "None"],
  database: ["PostgreSQL", "MongoDB", "SQLite", "None"],
  styling: ["TailwindCSS", "CSS Modules", "Styled Components", "None"],
  cicd: ["GitHub Actions", "Azure DevOps", "None"],
};

interface GuidedFormProps {
  onSubmit: (options: Record<string, string>) => void;
  isLoading: boolean;
}

export function GuidedForm({ onSubmit, isLoading }: GuidedFormProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const update = (key: string, value: string) =>
    setSelections((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(OPTIONS).map(([key, values]) => (
          <div key={key}>
            <label className="text-sm font-medium capitalize">{key}</label>
            <Select value={selections[key] || ""} onValueChange={(v) => update(key, v)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${key}`} />
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <Button
        onClick={() => onSubmit(selections)}
        disabled={Object.keys(selections).length < 2 || isLoading}
      >
        {isLoading ? "Generating Plan..." : "Generate Scaffold Plan"}
      </Button>
    </div>
  );
}
```

**Step 3: Create scaffold plan view component**

Create `src/components/scaffold/scaffold-plan-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, FolderTree } from "lucide-react";
import type { ScaffoldPlan } from "@/lib/types";

interface ScaffoldPlanViewProps {
  plan: ScaffoldPlan;
  knowledgeSources: string[];
  onConfirm: (repoName: string, isPrivate: boolean) => void;
  isCreating: boolean;
}

export function ScaffoldPlanView({ plan, knowledgeSources, onConfirm, isCreating }: ScaffoldPlanViewProps) {
  const [repoName, setRepoName] = useState(plan.repoName || "");
  const [visibility, setVisibility] = useState("private");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Scaffold Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{plan.description}</p>

        <div>
          <h4 className="text-sm font-medium mb-2">File Structure:</h4>
          <ul className="text-sm font-mono space-y-1">
            {plan.structure.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">{f.path}</span>
                <span className="text-xs text-muted-foreground">— {f.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Best Practices Applied:</h4>
          <div className="flex flex-wrap gap-1">
            {plan.bestPracticesApplied.map((bp, i) => (
              <Badge key={i} variant="secondary">
                <Check className="h-3 w-3 mr-1" /> {bp}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Knowledge Sources:</h4>
          <div className="flex flex-wrap gap-1">
            {knowledgeSources.map((s, i) => (
              <Badge key={i} variant="outline">{s}</Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-4 items-end pt-4 border-t">
          <div className="flex-1">
            <label className="text-sm font-medium">Repo Name</label>
            <Input value={repoName} onChange={(e) => setRepoName(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="text-sm font-medium">Visibility</label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => onConfirm(repoName, visibility === "private")}
            disabled={!repoName || isCreating}
          >
            {isCreating ? "Creating..." : "Create Repo & Scaffold"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Build scaffold page**

Create `src/app/scaffold/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NaturalLanguageForm } from "@/components/scaffold/natural-language-form";
import { GuidedForm } from "@/components/scaffold/guided-form";
import { ScaffoldPlanView } from "@/components/scaffold/scaffold-plan-view";
import type { ScaffoldPlan } from "@/lib/types";

export default function ScaffoldPage() {
  const [plan, setPlan] = useState<ScaffoldPlan | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ repoUrl: string } | null>(null);

  const generatePlan = async (body: any) => {
    setIsGenerating(true);
    setPlan(null);
    try {
      const res = await fetch("/api/scaffold/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setKnowledgeSources(data.knowledgeSources || []);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNaturalLanguage = (description: string) =>
    generatePlan({ mode: "natural-language", description });

  const handleGuided = (options: Record<string, string>) =>
    generatePlan({ mode: "guided", options });

  const handleCreate = async (repoName: string, isPrivate: boolean) => {
    if (!plan) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/scaffold/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, repoName, isPrivate }),
      });
      const data = await res.json();
      if (data.repoUrl) setResult({ repoUrl: data.repoUrl });
    } finally {
      setIsCreating(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Repo Created!</h1>
        <p>
          Your repository has been created:{" "}
          <a href={result.repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            {result.repoUrl}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scaffold New Repo</h1>

      <Tabs defaultValue="natural-language">
        <TabsList>
          <TabsTrigger value="natural-language">Natural Language</TabsTrigger>
          <TabsTrigger value="guided">Guided</TabsTrigger>
        </TabsList>
        <TabsContent value="natural-language" className="mt-4">
          <NaturalLanguageForm onSubmit={handleNaturalLanguage} isLoading={isGenerating} />
        </TabsContent>
        <TabsContent value="guided" className="mt-4">
          <GuidedForm onSubmit={handleGuided} isLoading={isGenerating} />
        </TabsContent>
      </Tabs>

      {plan && (
        <ScaffoldPlanView
          plan={plan}
          knowledgeSources={knowledgeSources}
          onConfirm={handleCreate}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/app/scaffold/ src/components/scaffold/
git commit -m "feat: add scaffold page with natural language and guided modes"
```

---

## Phase 6: Agent Management Feature

### Task 19: Agent API Routes

**Files:**
- Create: `src/app/api/agents/tasks/route.ts`
- Create: `src/app/api/agents/start/route.ts`
- Create: `src/app/api/agents/[taskId]/route.ts`
- Create: `src/app/api/repos/route.ts`
- Create: `src/app/api/repos/[owner]/[repo]/issues/route.ts`

**Step 1:** Create these API routes following the same patterns as Tasks 14 and 17. Each route should:

- `GET /api/agents/tasks` — List agent tasks from agent-store
- `POST /api/agents/start` — Start a new agent task (issue solver or code writer). Fetches repo context via Octokit, queries ChromaDB for agent instructions, invokes Copilot SDK, creates branch and PR.
- `GET /api/agents/[taskId]` — Get single task status
- `GET /api/repos` — List user's repos via Octokit
- `GET /api/repos/[owner]/[repo]/issues` — List open issues for a repo

**Step 2: Commit**

```bash
git add src/app/api/agents/ src/app/api/repos/
git commit -m "feat: add agent management and repo/issues API routes"
```

---

### Task 20: Agents UI Page

**Files:**
- Create: `src/app/agents/page.tsx`
- Create: `src/components/agents/repo-selector.tsx`
- Create: `src/components/agents/issue-list.tsx`
- Create: `src/components/agents/code-writer-form.tsx`
- Create: `src/components/agents/task-list.tsx`

Follow the same component patterns as Phase 4-5. The page has:
- Repo selector dropdown (fetches from `/api/repos`)
- Open issues list with "Assign to Agent" buttons
- Free-form code writing textarea with target branch input
- Active/recent tasks table

**Step 1:** Build all components.

**Step 2: Commit**

```bash
git add src/app/agents/ src/components/agents/
git commit -m "feat: add agent management page with repo selector, issues, and task list"
```

---

## Phase 7: Code Reviews Feature

### Task 21: Review API Routes

**Files:**
- Create: `src/app/api/reviews/start/route.ts`
- Create: `src/app/api/reviews/audit/route.ts`
- Create: `src/app/api/reviews/[reportId]/route.ts`

**Step 1:** Create review API routes:

- `POST /api/reviews/start` — Start a code review. Fetches code via Octokit, queries ChromaDB for review instructions, invokes Copilot SDK with `buildReviewPrompt`, returns structured findings.
- `POST /api/reviews/audit` — Start a best practices audit. Fetches repo tree via Octokit, queries ChromaDB for best practices docs, invokes Copilot SDK with `buildAuditPrompt`, returns compliance results.
- `GET /api/reviews/[reportId]` — Get a stored report.

**Step 2: Commit**

```bash
git add src/app/api/reviews/
git commit -m "feat: add code review and audit API routes"
```

---

### Task 22: Reviews UI Page

**Files:**
- Create: `src/app/reviews/page.tsx`
- Create: `src/components/reviews/review-form.tsx`
- Create: `src/components/reviews/review-results.tsx`
- Create: `src/components/reviews/audit-results.tsx`
- Create: `src/components/reviews/finding-card.tsx`

The page has two tabs: "Code Review" and "Best Practices Audit".

**Step 1:** Build all components following existing patterns.

**Step 2: Commit**

```bash
git add src/app/reviews/ src/components/reviews/
git commit -m "feat: add reviews page with code review and best practices audit tabs"
```

---

## Phase 8: Settings & Polish

### Task 23: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`

Simple settings page showing: GitHub connection status, ChromaDB status, environment info.

**Step 1:** Build the page. **Step 2:** Commit.

```bash
git add src/app/settings/
git commit -m "feat: add settings page with connection status"
```

---

### Task 24: Challenge Deliverables

**Files:**
- Create: `AGENTS.md`
- Create: `mcp.json`
- Create: `docs/README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/RAI.md`
- Create: `presentations/` (placeholder)
- Create: `.github/workflows/ci.yml`
- Update: `README.md`

**Step 1: Create AGENTS.md**

Custom instructions file for GitHub Copilot, describing Repo-Ninja's codebase conventions.

**Step 2: Create mcp.json**

```json
{
  "servers": []
}
```

**Step 3: Create docs/README.md**

Full documentation with problem statement, solution, prerequisites, setup instructions, deployment guide, architecture diagram, and RAI notes.

**Step 4: Create .github/workflows/ci.yml**

GitHub Actions workflow for lint + build + test.

**Step 5: Create docs/ARCHITECTURE.md**

Architecture diagram and description matching the design doc.

**Step 6: Create docs/RAI.md**

Responsible AI notes covering: data handling, transparency, bias mitigation, security.

**Step 7: Commit**

```bash
git add AGENTS.md mcp.json docs/ .github/ README.md presentations/
git commit -m "feat: add challenge deliverables (AGENTS.md, docs, CI/CD, RAI)"
```

---

## Phase 9: Testing

### Task 25: Unit Tests for Core Libraries

**Files:**
- Create: `src/__tests__/lib/chromadb/chunker.test.ts`
- Create: `src/__tests__/lib/copilot-sdk/prompts.test.ts`
- Create: `src/__tests__/lib/agent-store.test.ts`

**Step 1:** Write tests for the chunker, prompt builders, and agent store.

**Step 2:** Run tests.

```bash
cd src && npx jest --verbose
```

**Step 3:** Commit.

```bash
git add src/__tests__/
git commit -m "test: add unit tests for chunker, prompts, and agent store"
```

---

### Task 26: Integration Verification

**Step 1:** Start Docker Compose

```bash
docker-compose up -d
```

**Step 2:** Verify health check

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","services":{"chromadb":"connected"}}`

**Step 3:** Verify knowledge base reindex

```bash
curl -X POST http://localhost:3000/api/knowledge/reindex
```

Expected: `{"success":true,"indexed":N}` where N > 0

**Step 4:** Commit any fixes.

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-6 | Project scaffold, deps, Docker, auth, health |
| 2 | 7-11 | Types, ChromaDB store, Copilot SDK, Octokit, agent store |
| 3 | 12-13 | UI shell (header, sidebar, dashboard) |
| 4 | 14-16 | Knowledge base (API, UI, seed docs) |
| 5 | 17-18 | Scaffold feature (API, UI) |
| 6 | 19-20 | Agent management (API, UI) |
| 7 | 21-22 | Code reviews (API, UI) |
| 8 | 23-24 | Settings, challenge deliverables |
| 9 | 25-26 | Testing and integration verification |

**Total: 26 tasks across 9 phases**
