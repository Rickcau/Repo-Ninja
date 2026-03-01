# GitHub Copilot SDK - Resources & References

## Overview

The GitHub Copilot SDK is a multi-platform, programmable toolkit that enables developers to embed Copilot's agentic workflows into applications. It exposes the same engine behind Copilot CLI: a production-tested agent runtime you can invoke programmatically.

> **Status:** Technical Preview (functional but not yet production-ready)

---

## Official Repository

- **GitHub Copilot SDK**: [github.com/github/copilot-sdk](https://github.com/github/copilot-sdk)

---

## Key Features

- **Agent Runtime** - Handles planning, tool invocation, and file editing automatically
- **No Custom Orchestration Required** - Define agent behavior; the SDK manages execution
- **Tool Customization** - Configure which tools agents can access (file system, Git, web requests)
- **Custom Capabilities** - Support for custom agents, skills, and tools
- **Model Flexibility** - Access all Copilot CLI-available models at runtime
- **Multiple Authentication Methods** - GitHub credentials, OAuth apps, environment variables, or BYOK

---

## Supported Languages & Installation

| Language | Package Manager | Install Command |
|----------|-----------------|-----------------|
| **Node.js / TypeScript** | npm | `npm install @github/copilot-sdk` |
| **Python** | pip | `pip install github-copilot-sdk` |
| **Go** | go | `go get github.com/github/copilot-sdk/go` |
| **.NET** | NuGet | `dotnet add package GitHub.Copilot.SDK` |

Community-maintained SDKs also exist for Java, Rust, Clojure, and C++.

---

## Prerequisites

- **Copilot CLI** installed (separate requirement)
- **GitHub Copilot subscription** (unless using Bring Your Own Key)

---

## Architecture

The SDKs communicate with Copilot CLI via **JSON-RPC**. The SDK manages the CLI process lifecycle automatically or can connect to external servers in server mode.

---

## Authentication Options

| Method | Description |
|--------|-------------|
| **GitHub Credentials** | Signed-in user credentials |
| **OAuth GitHub App** | OAuth app tokens |
| **Environment Variables** | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` |
| **BYOK (Bring Your Own Key)** | Provider API keys for OpenAI, Azure AI Foundry, Anthropic |

---

## Documentation & Guides

| Resource | Link |
|----------|------|
| Getting Started | [docs/getting-started.md](https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md) |
| Authentication Guide | [docs/auth/index.md](https://github.com/github/copilot-sdk/blob/main/docs/auth/index.md) |
| BYOK Guide | [docs/auth/byok.md](https://github.com/github/copilot-sdk/blob/main/docs/auth/byok.md) |

---

## Related Repositories & Resources

| Resource | Link |
|----------|------|
| Copilot SDK Cookbooks | [github/awesome-copilot/cookbook/copilot-sdk](https://github.com/github/awesome-copilot/tree/main/cookbook/copilot-sdk) |
| Copilot SDK Collection | [github/awesome-copilot/collections/copilot-sdk.md](https://github.com/github/awesome-copilot/blob/main/collections/copilot-sdk.md) |
| GitHub Copilot Documentation | [docs.github.com/copilot](https://docs.github.com/en/copilot) |
| GitHub Copilot Trust Center | [resources.github.com/copilot-trust-center](https://resources.github.com/copilot-trust-center/) |

---

## Billing & Usage

- **Billing Model:** Per-prompt; counts toward your premium request quota
- **Issues & Feature Requests:** Report via [GitHub Issues](https://github.com/github/copilot-sdk/issues)

---

## Repository Stats

| Metric | Value |
|--------|-------|
| Stars | 7.2k |
| Forks | 862 |
| License | MIT |
| Commits | 156 |
| Contributors | 38 |
| Languages | TypeScript (28.8%), Python (25.2%), C# (23.0%), Go (21.4%) |

---

## How the SDK Actually Works (Repo-Ninja Usage Notes)

### The CLI and SDK are the Same Thing

The `copilot` command in the terminal IS the same agent runtime exposed by the SDK. Running `copilot` opens an interactive REPL; the SDK communicates with the same process via JSON-RPC. A text prompt sent via `session.sendAndWait({ prompt: "..." })` is equivalent to typing that prompt into the CLI. The agent can answer questions, plan tasks, and — critically — **call tools autonomously**.

### Built-in GitHub Tools via the GitHub MCP Server

The agent has no built-in GitHub capabilities by default. GitHub tools (create repo, create issue, open PR, merge PR, add comment, manage rulesets, etc.) are unlocked by connecting to **GitHub's hosted MCP server** in `createSession`:

```typescript
const session = await client.createSession({
  model: "gpt-4.1",
  streaming: true,
  mcpServers: {
    github: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      // Auth header passes the user's OAuth token through to the MCP server
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  },
});
```

With this, a single natural language prompt can instruct the agent to create a repo, open an issue, mention `@copilot` to trigger the coding agent, and set up a code review ruleset — **the agent calls GitHub's APIs itself** using its MCP tools.

### What We Were Doing Wrong (Old Approach)

The original scaffold route asked Copilot to **output file content as JSON text**, then parsed that response and called GitHub APIs from server-side code. This fails because:

- JSON parsing is fragile (Copilot wraps output in markdown, truncates long responses)
- File generation prompts time out on large scaffolds
- We were using Copilot as a "dumb text generator", not an agent

### The Correct Approach (Agent-Orchestrated Scaffold)

```typescript
// 1. start client with user's token
const copilot = new CopilotClient({ githubToken: accessToken });
await copilot.start();

// 2. create session connected to GitHub MCP server
const session = await copilot.createSession({
  model: "gpt-4.1",
  streaming: true,
  mcpServers: {
    github: { type: "http", url: "https://api.githubcopilot.com/mcp/",
              headers: { Authorization: `Bearer ${accessToken}` } },
  },
});

// 3. stream tool-call events as progress to the UI
session.on("tool.call", (event) => sendSSEProgress(event.data));

// 4. one prompt — agent plans and executes everything
await session.sendAndWait({
  prompt: `
    Create a new GitHub repository called '${repoName}' (${isPrivate ? "private" : "public"}).
    Then create an issue titled 'feat: scaffold initial project' with this specification as the body:
    ${scaffoldSpec}
    Then add a comment on the issue that says '@copilot please implement this issue'.
    Then create a branch ruleset on the default branch that requires Copilot code review on all PRs.
  `
});
```

The agent creates the repo, issues the API calls, and reports back — no JSON parsing required.

### Streaming Events

| Event | When it fires |
|-------|---------------|
| `assistant.message_delta` | Text response streaming chunk |
| `session.idle` | Agent finished thinking/acting |
| `tool.call` | Agent is invoking a tool (use for progress UI) |
| `tool.result` | Tool call completed with result |

### Custom Tools vs MCP Servers

| Concept | When to use |
|---------|-------------|
| `defineTool(name, { handler })` | You want the agent to call **your own TypeScript code** |
| `mcpServers: { ... }` | You want the agent to use **pre-built external tools** (GitHub, filesystem, etc.) |

For all GitHub operations in Repo-Ninja: use `mcpServers` with the GitHub MCP server — not custom `defineTool` wrappers around Octokit.

### MCP Documentation
- [MCP Overview](https://github.com/github/copilot-sdk/blob/main/docs/mcp/overview.md)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
