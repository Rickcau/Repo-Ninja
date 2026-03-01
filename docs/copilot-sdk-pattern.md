# Copilot SDK Pattern: Agentic vs. Dumb Completion

## Overview

Repo-Ninja has moved from a **manual orchestration** pattern to an **agentic** pattern for all GitHub Copilot SDK interactions that involve repository operations.

The GitHub Copilot CLI can autonomously read repos, create branches, commit files, and open PRs. The SDK should do the same. Previously, Repo-Ninja treated Copilot as a stateless text-completion API and did all the GitHub work itself via Octokit. Now, `agentWithGitHub()` gives the Copilot agent access to the GitHub MCP server tools, and the agent handles the GitHub operations autonomously.

---

## The Old Pattern (Don't Do This)

The old pattern manually orchestrated every step: fetch the repo tree, read files, build a JSON-output prompt, call `askCopilot()`, parse JSON from the text response, then manually create branches/commits/PRs via Octokit.

```typescript
// OLD PATTERN - manual orchestration (DO NOT USE for GitHub operations)
import { askCopilot } from "@/lib/copilot-sdk/client";
import { getRepoTree, getFileContent, createBranch, commitFiles, createPullRequest } from "@/lib/github/octokit";

// 1. Manually fetch repo structure
const tree = await getRepoTree(accessToken, owner, repo);
const fileContents = await getFileContent(accessToken, owner, repo, "src/index.ts");

// 2. Build a prompt that demands JSON output
const prompt = buildScaffoldPrompt(tree, fileContents, description);

// 3. Call Copilot as a dumb text-completion API (no tools, no agency)
const response = await askCopilot(accessToken, prompt);

// 4. Parse JSON from text response (fragile)
const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
const plan = JSON.parse(jsonMatch[1]);

// 5. Manually create branch, commit files, open PR via Octokit
const branch = await createBranch(accessToken, owner, repo, `feature/${plan.branchName}`);
await commitFiles(accessToken, owner, repo, branch, plan.files);
const prUrl = await createPullRequest(accessToken, owner, repo, branch, plan.title, plan.body);
```

Problems with this pattern:
- Fragile JSON parsing from free-text responses
- Copilot has no awareness of the repo beyond what you manually feed it
- Every new operation requires new Octokit plumbing
- Cannot recover or adapt if something goes wrong mid-execution

---

## The New Pattern (Do This)

The new pattern gives the Copilot agent GitHub MCP tools and a natural language prompt. The agent autonomously reads the repo, creates branches, commits files, and opens PRs.

```typescript
import { agentWithGitHub } from "@/lib/copilot-sdk/client";

// 1. Build a natural language prompt (no JSON format requirements)
const prompt = `You are Repo-Ninja, an expert developer agent.
You have access to GitHub tools to read repositories, create branches,
commit files, and open pull requests.

Repository: ${owner}/${repo}

Task: ${description}

Important:
- Create a feature branch (not directly on main)
- Make clean, well-organized commits
- Open a pull request with a clear description
- Follow existing patterns and conventions in the repository`;

// 2. Let the agent do the work
let detectedPrUrl = "";

const finalContent = await agentWithGitHub(
  accessToken,
  prompt,
  (event) => {
    if (event.type === "tool_call") {
      console.log(`Agent using tool: ${event.toolName}`);
    } else if (event.type === "tool_result") {
      // Extract PR URL from tool results
      const prMatch = event.detail?.match(/https:\/\/github\.com\/[^\s"]+\/pull\/\d+/);
      if (prMatch) detectedPrUrl = prMatch[0];
    } else if (event.type === "error") {
      console.error(`Agent error: ${event.detail}`);
    }
  },
  300_000 // 5 minute timeout
);

// 3. Extract PR URL from final content as fallback
if (!detectedPrUrl) {
  const prMatch = finalContent.match(/https:\/\/github\.com\/[^\s)]+\/pull\/\d+/);
  if (prMatch) detectedPrUrl = prMatch[0];
}
```

The agent autonomously:
- Reads the repo structure and relevant files
- Decides what changes to make
- Creates a feature branch
- Commits files (using the custom `commit_files` tool for atomic multi-file commits)
- Opens a pull request

### ChromaDB Knowledge Base Context

KB context is optional and fetched with graceful degradation. Wrap it in try/catch and continue without it if ChromaDB is unavailable:

```typescript
let kbContext = "";
try {
  const store = new ChromaDBStore();
  const knowledgeDocs = await store.search("relevant query", 5);
  if (knowledgeDocs.length > 0) {
    kbContext = "\n\nRelevant knowledge base documents for context:\n" +
      knowledgeDocs.map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`).join("\n\n");
  }
} catch (kbErr) {
  console.warn(`KB unavailable, continuing without:`, kbErr instanceof Error ? kbErr.message : kbErr);
}

// Append kbContext to the prompt
const prompt = `...your instructions...\n${kbContext}`;
```

---

## When to Use Each Function

| Function | Use When | Example |
|---|---|---|
| `agentWithGitHub()` | Any task involving reading a repo, making changes, creating PRs, reviewing code, auditing | Agent tasks, code reviews, audits, scaffold creation, applying fixes |
| `askCopilot()` | Simple text generation with **no GitHub operations** | Generating a markdown template, producing text content |
| `streamCopilot()` | Streaming text generation with **no GitHub operations** | Real-time text generation where you want incremental output |

**Rule of thumb:** If the task touches a GitHub repository in any way (reading files, creating branches, committing, opening PRs, reading issues), use `agentWithGitHub()`. If it is pure text generation, use `askCopilot()` or `streamCopilot()`.

---

## Error Handling

### Knowledge Base Degradation

Always wrap ChromaDB calls in try/catch. The agent should still function without KB grounding:

```typescript
try {
  const store = new ChromaDBStore();
  const docs = await store.search(query, 5);
  // use docs...
} catch (kbErr) {
  console.warn(`KB query failed (continuing without KB): ${kbErr}`);
  // Continue with prompt minus KB context
}
```

### Agent Errors

The `onProgress` callback receives error events. Log them and let the agent continue if possible. If `agentWithGitHub()` throws, catch it and report the failure:

```typescript
try {
  const result = await agentWithGitHub(accessToken, prompt, onProgress, 300_000);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  // Update task status to failed, log the error
}
```

### Timeout

`agentWithGitHub()` defaults to 5 minutes (300,000 ms). Complex tasks (scaffolding a full project, large audits) may need the full timeout. The timeout is passed directly to the SDK's `session.sendAndWait()`.

### Cancellation

For long-running background tasks, check `taskRunner.isCancelled(taskId)` at key checkpoints (before KB query, before agent call, after agent completes) to support user-initiated cancellation.

---

## Routes Already Converted to `agentWithGitHub()`

| Route | Purpose |
|---|---|
| `src/app/api/agents/start/route.ts` | All agent types: issue-solver, code-writer, custom-task |
| `src/app/api/reviews/audit/route.ts` | Best practices audit |
| `src/app/api/reviews/start/route.ts` | Code review |
| `src/app/api/reviews/apply-fix/route.ts` | Apply fix from a review finding |
| `src/app/api/scaffold/plan/route.ts` | Scaffold planning |
| `src/app/api/scaffold/create/route.ts` | Scaffold creation (was already using agentWithGitHub) |

---

## Routes That Legitimately Use `askCopilot()`

| Route | Purpose | Why Not Agentic |
|---|---|---|
| `src/app/api/scaffold/generate-template/route.ts` | Generate a markdown scaffolding template | Pure text generation. No GitHub operations needed -- the output is a markdown document, not a repo change. |
