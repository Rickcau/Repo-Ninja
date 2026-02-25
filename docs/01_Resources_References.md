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
