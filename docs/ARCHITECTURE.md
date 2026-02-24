# Repo-Ninja Architecture

## Overview

Repo-Ninja is a monolith Next.js application with a ChromaDB sidecar container. The Next.js app serves both the React UI and the API routes that orchestrate GitHub Copilot agents. ChromaDB provides semantic search over a customizable knowledge base of best practices, templates, and review instructions.

## Architecture Diagram

```
                         ┌─────────────────────┐
                         │      Browser         │
                         │   (React Client)     │
                         └──────────┬───────────┘
                                    │ HTTP / SSE
                                    │
┌───────────────────────────────────▼───────────────────────────────────┐
│                       Next.js Application                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    React UI (App Router)                      │    │
│  │  Dashboard | Scaffold | Agents | Reviews | Knowledge | Auth  │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                              │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │                     API Routes                                │    │
│  │  /api/scaffold  /api/agents  /api/reviews  /api/knowledge     │    │
│  └─────┬──────────────┬──────────────────────────┬──────────────┘    │
│        │              │                          │                   │
│  ┌─────▼──────┐ ┌─────▼──────────┐  ┌───────────▼──────────┐       │
│  │  Octokit   │ │  Copilot SDK   │  │  ChromaDB Client     │       │
│  │ (GitHub    │ │  (Agent Core)  │  │  (KnowledgeStore)    │       │
│  │   API)     │ │                │  │                      │       │
│  └─────┬──────┘ └────────────────┘  └───────────┬──────────┘       │
│        │                                         │                   │
└────────┼─────────────────────────────────────────┼───────────────────┘
         │                                         │
         ▼                                         ▼
┌─────────────────┐                    ┌──────────────────────┐
│    GitHub.com    │                    │   ChromaDB Server    │
│                  │                    │     (Docker)         │
│  - Repositories  │                    │                      │
│  - Issues / PRs  │                    │  - Knowledge docs    │
│  - OAuth         │                    │  - Embeddings        │
│  - Copilot API   │                    │  - Semantic search   │
└─────────────────┘                    └──────────────────────┘
```

## Components

### Browser (React Client)
The frontend is a React application rendered via the Next.js App Router. It uses Server Components for initial page loads and Client Components for interactive features. Real-time agent progress is received via Server-Sent Events (SSE).

### Next.js Application
A single Next.js application serves both the UI and the backend API. This monolith approach was chosen for development speed within the challenge timeline.

**React UI (App Router)**
- `src/app/page.tsx` - Dashboard with quick actions and status overview
- `src/app/scaffold/` - Repo scaffolding (natural language and guided modes)
- `src/app/agents/` - Agent management (issue assignment, code writing)
- `src/app/reviews/` - Code reviews and best practices audits
- `src/app/knowledge/` - Knowledge base document management
- `src/app/settings/` - GitHub account and configuration

**API Routes**
- `/api/scaffold` - Generates scaffold plans and creates repositories
- `/api/agents` - Starts and monitors agent sessions for issues and code writing
- `/api/reviews` - Runs code reviews and audits, generates PDF reports
- `/api/knowledge` - CRUD operations on knowledge base documents
- `/api/auth/[...nextauth]` - GitHub OAuth via NextAuth.js
- `/api/health` - Health check endpoint

### Octokit (GitHub API)
Handles all GitHub operations: creating repositories, fetching issues and PRs, committing files, and opening pull requests. Authenticated via the user's GitHub OAuth token.

### GitHub Copilot SDK (Agent Core)
Powers all AI agent interactions. The SDK is used to:
- Generate scaffold plans from natural language descriptions
- Solve GitHub issues by analyzing context and writing code
- Perform code reviews with structured findings
- Write code from free-form task descriptions

All agent prompts include context retrieved from ChromaDB to ground responses in the user's knowledge base.

### ChromaDB Client (KnowledgeStore)
The ChromaDB client is wrapped in a `KnowledgeStore` interface that abstracts the vector database:

```typescript
interface KnowledgeStore {
  search(query: string, topK: number): Promise<KnowledgeResult[]>;
  upsert(docId: string, content: string, metadata: DocMetadata): Promise<void>;
  delete(docId: string): Promise<void>;
  reindexAll(): Promise<void>;
}
```

This interface allows swapping ChromaDB for Azure AI Search or Foundry IQ without changing application code.

### ChromaDB Server (Docker)
Runs as a Docker container alongside the Next.js app via Docker Compose. Stores embedded knowledge base documents and provides fast semantic search. Documents are chunked by markdown headers before embedding.

## Data Flows

### Scaffold Flow
```
User describes project --> API fetches relevant knowledge from ChromaDB
--> Copilot SDK generates scaffold plan --> User reviews and approves
--> Copilot SDK generates file contents --> Octokit creates repo and commits files
--> Return repo URL to user
```

### Agent (Issue) Flow
```
User selects repo + issue --> Octokit fetches issue context
--> ChromaDB retrieves agent instructions --> Copilot SDK starts agent session
--> Agent works on branch (progress streamed via SSE)
--> Agent opens PR when done --> Return PR URL to user
```

### Code Review Flow
```
User selects repo + review type + scope --> Octokit fetches code or PR diff
--> ChromaDB retrieves review instructions --> Copilot SDK analyzes code
--> Structured findings returned (severity, scores, recommendations)
--> PDF report generated on demand
```

### Knowledge Base Flow
```
User creates/edits document --> API saves document content
--> Document chunked by markdown headers --> Chunks embedded and stored in ChromaDB
--> Future agent queries retrieve relevant chunks via semantic search
```

## Infrastructure

### Local Development (Docker Compose)
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [chromadb]

  chromadb:
    image: chromadb/chroma:latest
    ports: ["8000:8000"]
    volumes: [chroma-data:/chroma/chroma]
```

### Azure Deployment Path
- **Azure App Service** - Next.js application
- **Azure Container Apps** - ChromaDB (or Azure AI Search)
- **Azure Key Vault** - Secrets management
- **Foundry IQ** - Optional upgrade via KnowledgeStore interface swap
