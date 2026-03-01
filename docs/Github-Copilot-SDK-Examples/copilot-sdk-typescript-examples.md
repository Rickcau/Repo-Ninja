# GitHub Copilot SDK (TypeScript): Issue Assignment & Auto PR Review/Merge

## Prerequisites

```bash
# Install Copilot CLI (required — SDK communicates with it via JSON-RPC)
# Follow: https://docs.github.com/copilot/how-tos/copilot-cli/install-copilot-cli
gh extension install github/gh-copilot     # via GitHub CLI, or install standalone binary
copilot auth login                          # authenticate with your GitHub account

# Install the SDK
npm install @github/copilot-sdk

# For custom tool type validation (optional but recommended)
npm install zod
```

> The SDK requires Copilot CLI installed and authenticated. It manages the CLI process lifecycle automatically.

---

## Part 1: Create an Issue and Assign It to Copilot Coding Agent

The Copilot SDK gives you the agentic loop (planning, tool use, multi-turn execution). The GitHub MCP server ships **bundled with the Copilot CLI** — no separate install or config needed. It provides tools like `create_issue`, `list_issues`, `create_pull_request`, etc. By default the built-in tools are **read-only**; pass `--enable-all-github-mcp-tools` to unlock write operations.

### Example 1A: Using the Built-in GitHub MCP Server

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const OWNER = "your-org";
const REPO = "your-repo";

async function createIssueAndAssignCopilot() {
  const client = new CopilotClient({
    cliArgs: ["--enable-all-github-mcp-tools"], // Enable write operations (create issues, PRs, etc.)
  });
  await client.start();

  const session = await client.createSession({
    model: "gpt-4.1",
    systemMessage: {
      mode: "append",
      content: `
        You are a project manager agent. You have access to GitHub tools
        via the built-in GitHub MCP server. When asked to create issues,
        use the GitHub MCP tools to create them in the ${OWNER}/${REPO}
        repository and assign them to copilot-swe-agent so the coding
        agent picks them up.
      `,
    },
    // No MCP config needed — the GitHub MCP server ships bundled with
    // the Copilot CLI and authenticates automatically.
    // Just make sure to pass --enable-all-github-mcp-tools to the client
    // (see CopilotClient constructor above) for write operations.
  });

  const response = await session.sendAndWait({
    prompt: `
      Create a new issue in ${OWNER}/${REPO} with the following details:

      Title: "Add input validation to user registration endpoint"

      Body:
      ## Description
      The /api/register endpoint accepts any input without validation.

      ## Acceptance Criteria
      - Validate email format using a standard regex
      - Enforce password minimum length of 8 characters
      - Return 400 with descriptive error messages for invalid input
      - Add unit tests for all validation logic

      ## Technical Notes
      - Use the existing validation utility in src/utils/validators.ts
      - Follow the error response format in src/types/errors.ts

      Labels: enhancement, good-first-issue
      Assignee: copilot-swe-agent

      After creating the issue, confirm the issue number and URL.
    `,
  });

  console.log("Agent response:", response?.data.content);

  await session.destroy();
  await client.stop();
}

createIssueAndAssignCopilot().catch(console.error);
```

Once the issue is created and assigned to `copilot-swe-agent`, the Copilot coding agent will automatically:
1. React with 👀 on the issue
2. Create a draft PR on a `copilot/` branch
3. Explore the repo, write code, run tests
4. Request your review when finished

### Example 1B: Using Custom Tools for Full Control

If you want explicit control over the GitHub API calls instead of relying on MCP, define custom tools using `defineTool`:

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "your-org";
const REPO = "your-repo";

// Custom tool: create a GitHub issue
const createIssueTool = defineTool({
  name: "create_github_issue",
  description:
    "Creates a GitHub issue and optionally assigns it to Copilot coding agent",
  parameters: z.object({
    title: z.string().describe("Issue title"),
    body: z.string().describe("Issue body in markdown"),
    labels: z.array(z.string()).optional().describe("Labels to apply"),
    assignToCopilot: z
      .boolean()
      .optional()
      .describe("Whether to assign to Copilot coding agent"),
  }),
  handler: async (args) => {
    // Create the issue
    const { data: issue } = await octokit.rest.issues.create({
      owner: OWNER,
      repo: REPO,
      title: args.title,
      body: args.body,
      labels: args.labels,
    });

    // Assign to Copilot via GraphQL if requested
    if (args.assignToCopilot) {
      const graphqlHeaders = {
        "GraphQL-Features":
          "issues_copilot_assignment_api_support,coding_agent_model_selection",
      };

      // Find copilot-swe-agent bot ID
      const actors: any = await octokit.graphql(
        `query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
              nodes { login, ... on Bot { id } }
            }
          }
        }`,
        { owner: OWNER, repo: REPO, headers: graphqlHeaders }
      );

      const bot = actors.repository.suggestedActors.nodes.find(
        (n: any) => n.login === "copilot-swe-agent"
      );

      if (bot) {
        // Get issue GraphQL ID
        const issueData: any = await octokit.graphql(
          `query($owner: String!, $repo: String!, $number: Int!) {
            repository(owner: $owner, name: $repo) {
              issue(number: $number) { id }
            }
          }`,
          { owner: OWNER, repo: REPO, number: issue.number, headers: graphqlHeaders }
        );

        // Assign Copilot
        await octokit.graphql(
          `mutation($issueId: ID!, $botId: ID!) {
            replaceActorsForAssignable(input: {
              assignableId: $issueId, actorIds: [$botId]
            }) {
              assignable { ... on Issue { id } }
            }
          }`,
          {
            issueId: issueData.repository.issue.id,
            botId: bot.id,
            headers: graphqlHeaders,
          }
        );
      }
    }

    return {
      issueNumber: issue.number,
      url: issue.html_url,
      assignedToCopilot: args.assignToCopilot ?? false,
    };
  },
});

// Custom tool: list recent issues
const listIssuesTool = defineTool({
  name: "list_repo_issues",
  description: "Lists open issues in the repository",
  parameters: z.object({
    state: z.enum(["open", "closed", "all"]).optional(),
    limit: z.number().optional().describe("Max issues to return"),
  }),
  handler: async (args) => {
    const { data } = await octokit.rest.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      state: args.state ?? "open",
      per_page: args.limit ?? 10,
    });
    return data.map((i) => ({
      number: i.number,
      title: i.title,
      assignee: i.assignee?.login,
      labels: i.labels.map((l: any) => (typeof l === "string" ? l : l.name)),
    }));
  },
});

async function main() {
  const client = new CopilotClient();
  await client.start();

  const session = await client.createSession({
    model: "gpt-4.1",
    tools: [createIssueTool, listIssuesTool],
    systemMessage: {
      mode: "append",
      content: `
        You are a development workflow agent. You can create GitHub issues
        and assign them to Copilot coding agent for autonomous completion.
        Always confirm what you've done after each action.
      `,
    },
  });

  // The agent will use the custom tools to create the issue and assign Copilot
  const response = await session.sendAndWait({
    prompt: `
      Create an issue titled "Refactor auth middleware to support JWT refresh tokens"
      with a detailed description covering:
      - Current behavior (tokens expire, user must re-login)
      - Desired behavior (automatic silent refresh)
      - Acceptance criteria
      - Affected files: src/middleware/auth.ts, src/services/token.ts

      Label it "enhancement" and "security".
      Assign it to Copilot so it starts working on it immediately.
    `,
  });

  console.log(response?.data.content);

  await session.destroy();
  await client.stop();
}

main().catch(console.error);
```

### Example 1C: Batch Issue Creation with Streaming

Create multiple issues from a backlog and assign them all to Copilot:

```typescript
import { CopilotClient } from "@github/copilot-sdk";

async function batchCreateIssues() {
  const client = new CopilotClient();
  await client.start();

  const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
  });

  // Stream progress as Copilot works through the batch
  session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
  });

  session.on("tool.call", (event) => {
    console.log(`\n🔧 Calling tool: ${event.data.name}`);
  });

  await session.sendAndWait({
    prompt: `
      Using the GitHub tools, create the following issues in my-org/my-repo
      and assign each one to copilot-swe-agent:

      1. "Add rate limiting to API endpoints"
         - Apply to all /api/* routes
         - Use sliding window algorithm
         - Return 429 with Retry-After header

      2. "Add OpenAPI/Swagger documentation"
         - Generate from existing route definitions
         - Serve at /api/docs
         - Include request/response examples

      3. "Increase unit test coverage to 80%"
         - Focus on src/services/ directory
         - Add edge case tests for error handling
         - Mock external API calls

      Report back with each issue number and URL as you create them.
    `,
  });

  await session.destroy();
  await client.stop();
}

batchCreateIssues().catch(console.error);
```

---

## Part 2: Auto-Review PRs and Merge to Main

### Example 2A: PR Review Agent with Custom Tools

Build an agent that watches for new PRs, reviews them using Copilot's intelligence, and merges if they pass quality checks:

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "your-org";
const REPO = "your-repo";

// Tool: Get PR details and diff
const getPRDetailsTool = defineTool({
  name: "get_pr_details",
  description: "Fetches PR metadata, diff, and CI status",
  parameters: z.object({
    prNumber: z.number().describe("Pull request number"),
  }),
  handler: async (args) => {
    const [pr, diff, checks] = await Promise.all([
      octokit.rest.pulls.get({
        owner: OWNER,
        repo: REPO,
        pull_number: args.prNumber,
      }),
      octokit.rest.pulls.get({
        owner: OWNER,
        repo: REPO,
        pull_number: args.prNumber,
        mediaType: { format: "diff" },
      }),
      octokit.rest.checks.listForRef({
        owner: OWNER,
        repo: REPO,
        ref: (
          await octokit.rest.pulls.get({
            owner: OWNER,
            repo: REPO,
            pull_number: args.prNumber,
          })
        ).data.head.sha,
      }),
    ]);

    return {
      title: pr.data.title,
      body: pr.data.body,
      author: pr.data.user?.login,
      branch: pr.data.head.ref,
      baseBranch: pr.data.base.ref,
      changedFiles: pr.data.changed_files,
      additions: pr.data.additions,
      deletions: pr.data.deletions,
      mergeable: pr.data.mergeable,
      diff: (diff.data as unknown as string).slice(0, 15000), // Truncate large diffs
      ciStatus: checks.data.check_runs.map((c) => ({
        name: c.name,
        status: c.status,
        conclusion: c.conclusion,
      })),
    };
  },
});

// Tool: Approve and merge PR
const mergePRTool = defineTool({
  name: "approve_and_merge_pr",
  description:
    "Approves the PR with a review comment and merges it to the base branch",
  parameters: z.object({
    prNumber: z.number(),
    reviewBody: z.string().describe("The approval review comment"),
    mergeMethod: z.enum(["squash", "merge", "rebase"]).optional(),
  }),
  handler: async (args) => {
    // Submit approval review
    await octokit.rest.pulls.createReview({
      owner: OWNER,
      repo: REPO,
      pull_number: args.prNumber,
      event: "APPROVE",
      body: args.reviewBody,
    });

    // Merge the PR
    const result = await octokit.rest.pulls.merge({
      owner: OWNER,
      repo: REPO,
      pull_number: args.prNumber,
      merge_method: args.mergeMethod ?? "squash",
    });

    return {
      merged: result.data.merged,
      sha: result.data.sha,
      message: result.data.message,
    };
  },
});

// Tool: Request changes on PR
const requestChangesTool = defineTool({
  name: "request_changes",
  description: "Submits a review requesting changes on the PR",
  parameters: z.object({
    prNumber: z.number(),
    reviewBody: z.string().describe("Detailed feedback on what needs fixing"),
  }),
  handler: async (args) => {
    await octokit.rest.pulls.createReview({
      owner: OWNER,
      repo: REPO,
      pull_number: args.prNumber,
      event: "REQUEST_CHANGES",
      body: args.reviewBody,
    });
    return { status: "changes_requested" };
  },
});

// Tool: List open PRs targeting main
const listOpenPRsTool = defineTool({
  name: "list_open_prs",
  description: "Lists open pull requests targeting the main branch",
  parameters: z.object({
    base: z.string().optional().describe("Base branch filter (default: main)"),
  }),
  handler: async (args) => {
    const { data } = await octokit.rest.pulls.list({
      owner: OWNER,
      repo: REPO,
      state: "open",
      base: args.base ?? "main",
    });
    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login,
      createdAt: pr.created_at,
      draft: pr.draft,
    }));
  },
});

async function reviewAndMergePR(prNumber: number) {
  const client = new CopilotClient();
  await client.start();

  const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
    tools: [getPRDetailsTool, mergePRTool, requestChangesTool, listOpenPRsTool],
    systemMessage: {
      mode: "append",
      content: `
        You are a senior code reviewer agent. Your job is to review pull requests
        and decide whether to approve+merge or request changes.

        ## Review Criteria
        1. **Security**: No hardcoded secrets, SQL injection, XSS vulnerabilities
        2. **Tests**: New code must have corresponding test coverage
        3. **CI Status**: All checks must pass before merging
        4. **Code Quality**: Proper error handling, no magic numbers, DRY principles
        5. **Breaking Changes**: Flag any public API or schema changes

        ## Decision Rules
        - If ALL CI checks pass AND no security/quality issues → approve and merge (squash)
        - If CI checks are failing → request changes, explain which checks failed
        - If security issues found → request changes with HIGH PRIORITY flag
        - If minor style issues only → approve and merge, mention suggestions in review

        Always explain your reasoning in the review comment.
      `,
    },
  });

  // Stream the agent's thought process
  session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
  });

  session.on("tool.call", (event) => {
    console.log(`\n🔧 Tool: ${event.data.name}`);
  });

  const response = await session.sendAndWait({
    prompt: `
      Review pull request #${prNumber} in ${OWNER}/${REPO}.

      1. Fetch the PR details and diff
      2. Analyze the code changes against the review criteria
      3. Check that all CI checks have passed
      4. Make your decision: approve+merge or request changes
      5. Execute your decision using the appropriate tool
    `,
  });

  console.log("\n\nFinal decision:", response?.data.content);

  await session.destroy();
  await client.stop();
}

// Review a specific PR
reviewAndMergePR(42).catch(console.error);
```

### Example 2B: Continuous PR Watcher (Poll & Auto-Review)

Run this as a long-lived process or cron job to automatically review incoming PRs:

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "your-org";
const REPO = "your-repo";
const POLL_INTERVAL_MS = 60_000; // Check every minute

const reviewedPRs = new Set<number>();

async function pollAndReview() {
  // List open PRs that haven't been reviewed yet
  const { data: prs } = await octokit.rest.pulls.list({
    owner: OWNER,
    repo: REPO,
    state: "open",
    base: "main",
    sort: "created",
    direction: "desc",
  });

  for (const pr of prs) {
    if (pr.draft || reviewedPRs.has(pr.number)) continue;

    // Check if PR has pending review requests
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner: OWNER,
      repo: REPO,
      pull_number: pr.number,
    });

    const hasBeenReviewed = reviews.some(
      (r) => r.state === "APPROVED" || r.state === "CHANGES_REQUESTED"
    );

    if (hasBeenReviewed) {
      reviewedPRs.add(pr.number);
      continue;
    }

    console.log(`\n📋 Reviewing PR #${pr.number}: ${pr.title}`);

    // Spin up a Copilot session to review this PR
    const client = new CopilotClient();
    await client.start();

    const session = await client.createSession({
      model: "gpt-4.1",
      tools: [
        /* same tools as Example 2A */
      ],
      systemMessage: {
        mode: "append",
        content: `You are an automated PR reviewer. Review the PR, and if all
          CI checks pass and the code looks good, approve and squash-merge it.
          If there are issues, request changes with specific feedback.`,
      },
    });

    try {
      await session.sendAndWait({
        prompt: `Review and process PR #${pr.number} in ${OWNER}/${REPO}.
          Fetch details, analyze the diff, check CI, and make your decision.`,
      });
      reviewedPRs.add(pr.number);
    } catch (err) {
      console.error(`Error reviewing PR #${pr.number}:`, err);
    } finally {
      await session.destroy();
      await client.stop();
    }
  }
}

// Run continuously
async function main() {
  console.log(`🤖 PR Review Agent started for ${OWNER}/${REPO}`);
  console.log(`   Polling every ${POLL_INTERVAL_MS / 1000}s...\n`);

  while (true) {
    await pollAndReview();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
```

---

## Part 3: End-to-End Pipeline (Issue → Code → Review → Merge)

Combine both parts into one orchestrator agent:

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

async function fullPipeline(taskDescription: string) {
  const client = new CopilotClient();
  await client.start();

  const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
    tools: [
      // Include all tools from Part 1 and Part 2:
      // createIssueTool, getPRDetailsTool, mergePRTool, requestChangesTool
    ],
    systemMessage: {
      mode: "append",
      content: `
        You are a full-cycle development orchestrator. Your workflow:

        1. PLAN: Break the task into a well-scoped GitHub issue
        2. CREATE: Create the issue and assign to copilot-swe-agent
        3. WAIT: Inform the user that Copilot coding agent is working
        4. REVIEW: When prompted, review the resulting PR
        5. MERGE: If the PR passes review, merge to main

        You handle steps 1-3 immediately. Steps 4-5 happen when the
        user calls you again after Copilot has finished its work.
      `,
    },
  });

  session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
  });

  await session.sendAndWait({
    prompt: taskDescription,
  });

  await session.destroy();
  await client.stop();
}

// Usage — Phase 1: Create issue and kick off Copilot
fullPipeline(`
  I need to add rate limiting to all our API endpoints.
  Create an issue with full acceptance criteria and assign it to Copilot.
`);

// Later — Phase 2: Review the PR that Copilot created
// fullPipeline(`Review and merge PR #87 that Copilot created for the rate limiting task.`);
```

---

## Key SDK Patterns Reference

### Session Configuration Options

```typescript
const session = await client.createSession({
  model: "gpt-4.1",                      // or "gpt-5", "claude-sonnet-4.5", etc.
  streaming: true,                        // real-time response chunks
  tools: [myTool1, myTool2],             // custom tools with defineTool()
  systemMessage: {
    mode: "append",                       // "append" or "replace"
    content: "Your custom instructions",
  },
  availableTools: ["tool1", "tool2"],     // whitelist built-in tools
  excludedTools: ["tool3"],              // blacklist specific tools
  infiniteSessions: { enabled: true },    // long-running sessions
});
```

### Event Types

```typescript
session.on("assistant.message", (e) => {});       // Final complete message
session.on("assistant.message_delta", (e) => {});  // Streaming chunk
session.on("tool.call", (e) => {});                // Agent is calling a tool
session.on("tool.result", (e) => {});              // Tool returned a result
session.on("session.idle", () => {});              // Session finished processing
session.on("session.error", (e) => {});            // Error occurred
```

### Custom Tool Pattern

```typescript
import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const myTool = defineTool({
  name: "tool_name",
  description: "What this tool does",
  parameters: z.object({
    input: z.string().describe("Description for the LLM"),
  }),
  handler: async (args) => {
    // Your logic here
    return { result: "any JSON-serializable value" };
  },
});
```

---

## Important Notes

| Topic | Detail |
|-------|--------|
| **SDK vs Coding Agent** | The SDK embeds Copilot's agentic loop in YOUR app. The Coding Agent runs on GitHub Actions. They complement each other — use the SDK to create/assign issues, the Coding Agent does the coding. |
| **Authentication** | SDK uses your Copilot CLI auth. For GitHub API tools, use a PAT from a Copilot-enabled user. |
| **Copilot assignment** | `copilot-swe-agent` must be assigned via GraphQL `replaceActorsForAssignable` (or `createIssue` with `assigneeIds`). The MCP GitHub tools can handle this if configured. |
| **Review approvals** | Copilot code reviews do NOT count toward required approval counts in branch protection. |
| **Costs** | SDK calls consume Copilot premium requests. Coding agent tasks also consume GitHub Actions minutes. |
| **SDK status** | Technical Preview — APIs may change. Check [github/copilot-sdk](https://github.com/github/copilot-sdk) for updates. |
