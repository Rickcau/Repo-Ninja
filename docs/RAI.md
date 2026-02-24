# Repo-Ninja Responsible AI Notes

## Overview

Repo-Ninja delegates development tasks to AI agents powered by the GitHub Copilot SDK. Because these agents create repositories, write code, open pull requests, and generate review reports, it is important that the system operates transparently, securely, and with appropriate human oversight. This document describes how Repo-Ninja addresses responsible AI principles.

## Data Handling and Privacy

- **User-authorized access only.** Repo-Ninja only accesses GitHub repositories, issues, and pull requests that the authenticated user has explicitly authorized via GitHub OAuth. No data is accessed beyond the scopes the user grants.
- **No training on user data.** Code and repository content processed by Repo-Ninja is sent to the GitHub Copilot SDK for analysis. Repo-Ninja itself does not store, log, or use repository code beyond the immediate request.
- **Knowledge base is user-controlled.** The ChromaDB knowledge base contains only documents that users or administrators have explicitly uploaded. No external data is ingested automatically.
- **Ephemeral processing.** Code content fetched for reviews and audits is processed in memory and not persisted after the response is returned.

## Transparency

- **Knowledge sources are visible.** When Repo-Ninja generates a scaffold plan, review, or agent action, the system shows which knowledge base documents were retrieved and used to ground the AI response. Users can see exactly what context influenced the output.
- **Agent progress is streamed.** Long-running agent tasks (issue solving, code writing) stream real-time progress updates via SSE. Users can observe what the agent is doing at each step rather than waiting for an opaque result.
- **Structured findings.** Code review results are returned as structured data with severity levels (HIGH/MED/LOW), category scores, and specific file/line references. This makes it clear what the AI found and why.
- **No hidden actions.** All GitHub operations (repo creation, branch creation, commits, PR opening) are performed via the user's own OAuth token. Every action is visible in the user's GitHub activity log.

## Human-in-the-Loop

- **Scaffold plans require approval.** When a user requests a new repository scaffold, the system generates a plan (file structure, best practices to apply, knowledge sources used) and presents it for review. The repository is only created after the user explicitly approves the plan.
- **Review reports are for human review.** Code review and audit reports are informational. They present findings and recommendations but do not automatically merge, close, or modify any code. A human developer decides what to act on.
- **Agent PRs require human merge.** When an agent completes work on an issue or code writing task, it opens a pull request. The PR goes through the normal review process -- it is not auto-merged.
- **Knowledge base is manually curated.** The best practices, templates, and instructions that ground all AI behavior are authored and maintained by humans. Changes require explicit save and re-index actions.

## Bias Mitigation

- **Customizable knowledge base.** Repo-Ninja does not impose a fixed set of opinions about code quality or architecture. Organizations customize the knowledge base with their own standards, so the AI's recommendations reflect the team's values rather than generic defaults.
- **Multiple review types.** Code reviews can be configured by type (security, performance, accessibility, general quality), allowing teams to focus on what matters to them rather than receiving a one-size-fits-all assessment.
- **Transparent scoring.** Review scores are broken down by category with specific findings. Users can evaluate whether they agree with the scoring rather than accepting an opaque overall grade.
- **Open document format.** Knowledge base documents are plain Markdown files that anyone on the team can read, edit, and discuss. There is no proprietary format or hidden configuration.

## Security

- **GitHub OAuth scoping.** Repo-Ninja requests only the OAuth scopes it needs: `repo` (to access repositories), `read:user` (to read the user's profile), and `read:org` (to read organization membership). Users can review and revoke access at any time from their GitHub settings.
- **No persistent token storage.** OAuth tokens are managed by NextAuth.js sessions and are not written to disk or logged. Session data is encrypted with `NEXTAUTH_SECRET`.
- **Environment-based secrets.** All credentials (GitHub OAuth secrets, API keys) are stored in environment variables, not in code. The `.env.example` file documents required variables without containing actual values.
- **ChromaDB is local.** The ChromaDB instance runs as a local Docker container. Knowledge base data does not leave the deployment environment unless the user explicitly configures an external vector store.
- **No arbitrary code execution.** Agent-generated code is committed to branches and opened as pull requests. It is never executed on the server. All code runs through the normal GitHub review and CI/CD process before reaching production.

## Limitations

- **AI-generated code requires review.** While Repo-Ninja grounds agent output in knowledge base context, AI-generated code can still contain errors, security vulnerabilities, or logic bugs. All agent output should be reviewed by a human developer before merging.
- **Knowledge base quality matters.** The quality of Repo-Ninja's recommendations is directly tied to the quality of the knowledge base documents. Outdated or incorrect best practices will lead to outdated or incorrect AI output.
- **Not a replacement for security tools.** AI code reviews are a supplement to, not a replacement for, dedicated security scanning tools (SAST, DAST, dependency auditing). Use Repo-Ninja's security reviews as one layer in a defense-in-depth strategy.
