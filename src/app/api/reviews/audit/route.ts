import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { agentWithGitHub } from "@/lib/copilot-sdk/client";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import type { AuditReport } from "@/lib/types";
import { nanoid } from "nanoid";
import { saveReport } from "../report-store";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import { taskRunner } from "@/lib/services/task-runner";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { repo: string };

  if (!body.repo) {
    return NextResponse.json({ error: "Missing required field: repo" }, { status: 400 });
  }

  const [owner, repo] = body.repo.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repo format. Use owner/repo" }, { status: 400 });
  }

  const auditId = nanoid();
  const accessToken = session.accessToken;
  const userEmail = session.user?.email ?? undefined;

  const initialReport: AuditReport & { status: string } = {
    id: auditId,
    repo: body.repo,
    complianceScore: 0,
    checks: [],
    recommendations: [],
    createdAt: new Date().toISOString(),
    status: "running",
  };
  await saveReport(auditId, initialReport);

  taskRunner.enqueue(auditId, async () => {
    const workId = await logWorkStart(userEmail, "best-practices-audit", body.repo, `Best practices audit: ${body.repo}`, auditId);

    try {
      if (taskRunner.isCancelled(auditId)) return;

      // Try to get KB context (graceful degradation)
      let kbContext = "";
      try {
        const store = new ChromaDBStore();
        const knowledgeDocs = await store.search("best practices audit compliance", 6);
        if (knowledgeDocs.length > 0) {
          kbContext = "\n\nRelevant best practices from the knowledge base:\n" +
            knowledgeDocs.map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`).join("\n\n");
        }
      } catch (kbErr) {
        console.warn(`[reviews/audit] KB unavailable, continuing without:`, kbErr instanceof Error ? kbErr.message : kbErr);
      }

      if (taskRunner.isCancelled(auditId)) return;

      const prompt = `You are Repo-Ninja, a best practices auditor. You have access to GitHub tools to read repositories.

Repository: ${body.repo}

Task: Perform a comprehensive best practices audit on this repository. Follow these steps in order:

**Step 1 — Detect the repository type.** Use GitHub tools to read the root directory and key files to determine:
- Primary language (TypeScript, C#, Python, Java, Go, Rust, etc.)
- Framework (Next.js, ASP.NET Core, Django, Spring Boot, Express, FastAPI, etc.)
- Runtime (Node.js, .NET, Python, JVM, etc.)
- Project type (web app, REST API, library, CLI tool, etc.)

Look for telltale files: package.json (Node.js), *.csproj/*.sln (C#/.NET), requirements.txt/pyproject.toml (Python), go.mod (Go), Cargo.toml (Rust), pom.xml/build.gradle (Java), etc.

**Step 2 — Apply the RIGHT best practices for this repo type.** Only check for practices that are relevant to the detected language and framework. Examples:
- C# / ASP.NET Core: Check for .editorconfig, nullable reference types, Program.cs minimal API vs controllers, appsettings.json structure, middleware pipeline, dependency injection, xUnit/NUnit tests, etc.
- Node.js / Next.js: Check for tsconfig strict mode, ESLint config, package.json scripts, testing framework, etc.
- Python / Django/FastAPI: Check for pyproject.toml, type hints, pytest setup, linting (ruff/flake8), etc.
- Go: Check for go.mod, golangci-lint, test files, etc.

Do NOT apply Node.js/TypeScript-specific checks (like tsconfig.json or ESLint) to non-Node.js repos. Do NOT apply C#-specific checks to Node.js repos. Match the checks to the actual technology stack.

**Step 3 — Check universal best practices** that apply to all repos:
- CI/CD pipeline (GitHub Actions, Azure DevOps, etc.)
- README and documentation
- .gitignore configuration
- Security practices (no secrets in code, dependency scanning)
- Docker/containerization setup (if applicable)
- Testing presence and coverage
- Code organization and structure
${kbContext}

After reviewing the repository, respond with ONLY a JSON object in this exact format (no markdown, no explanation, just the JSON):
{
  "repoType": "ASP.NET Core REST API",
  "detectedStack": { "language": "C#", "framework": "ASP.NET Core", "runtime": ".NET 8" },
  "complianceScore": 72,
  "checks": [
    { "name": "Nullable reference types", "status": "pass", "description": "Enabled in .csproj" },
    { "name": "CI/CD pipeline", "status": "fail", "description": "No GitHub Actions workflow found" },
    { "name": "Unit tests", "status": "warning", "description": "xUnit project exists but only 3 tests" }
  ],
  "recommendations": [
    "Add a GitHub Actions workflow for CI/CD",
    "Increase unit test coverage for controllers",
    "Add integration tests for API endpoints"
  ]
}

Status must be one of: "pass", "fail", or "warning".
Be thorough — check as many files as needed to give an accurate assessment. The checks and recommendations MUST be specific to the detected technology stack.`;

      const response = await agentWithGitHub(
        accessToken,
        prompt,
        (event) => {
          if (event.type === "error") {
            console.error(`[reviews/audit] Agent error:`, event.detail);
          }
        },
        300_000
      );

      if (taskRunner.isCancelled(auditId)) return;

      // Parse the JSON from the agent's response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const snippet = response.slice(0, 300).replace(/\n/g, " ");
        const errMsg = `No JSON found in agent response. Starts with: ${snippet}`;
        console.error(`[reviews/audit] ${errMsg}`);
        await saveReport(auditId, { ...initialReport, status: "failed", checks: [{ name: "Parse Error", status: "fail" as const, description: errMsg }] });
        await logWorkFailure(workId, errMsg);
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const report: AuditReport & { status: string } = {
        id: auditId,
        repo: body.repo,
        repoType: parsed.repoType ?? undefined,
        detectedStack: parsed.detectedStack ?? undefined,
        complianceScore: parsed.complianceScore ?? 0,
        checks: parsed.checks ?? [],
        recommendations: parsed.recommendations ?? [],
        createdAt: initialReport.createdAt,
        status: "completed",
      };

      await saveReport(auditId, report);
      await logWorkComplete(workId, { reportId: auditId, checksCount: report.checks.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[reviews/audit] Audit ${auditId} failed:`, message);
      await saveReport(auditId, { ...initialReport, status: "failed", checks: [{ name: "Audit Error", status: "fail" as const, description: message }] });
      await logWorkFailure(workId, message);
    }
  });

  return NextResponse.json({ id: auditId, status: "running" }, { status: 202 });
}
