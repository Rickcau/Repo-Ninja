import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { agentWithGitHub } from "@/lib/copilot-sdk/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { taskRunner } from "@/lib/services/task-runner";
import { saveScaffoldPlan, updateScaffoldPlanStatus, logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import type { ScaffoldRequest } from "@/lib/types";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as ScaffoldRequest & { repoName?: string };

    let searchQuery: string;
    if (body.mode === "natural-language" && body.description) {
      searchQuery = body.description;
    } else if (body.mode === "guided" && body.options) {
      searchQuery = Object.values(body.options).filter(Boolean).join(" ");
    } else if (body.mode === "from-template" && body.templateId) {
      searchQuery = body.extraDescription || body.templateId;
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const planId = nanoid();
    const accessToken = session.accessToken;
    const userEmail = session.user?.email ?? undefined;
    const description = body.extraDescription || body.description || searchQuery;
    const repoName = body.repoName || "";

    // Save initial plan with status "generating"
    await saveScaffoldPlan(
      planId,
      body.mode,
      description,
      { repoName, description: description, structure: [], bestPracticesApplied: [], knowledgeSources: [] },
      [],
      "generating",
      userEmail
    );

    // Capture from-template fields for use inside the closure
    const templateId = body.mode === "from-template" ? body.templateId : undefined;
    const extraDescription = body.mode === "from-template" ? (body.extraDescription ?? "") : "";

    // Enqueue background work
    taskRunner.enqueue(planId, async () => {
      const workId = await logWorkStart(userEmail, "scaffold-plan", undefined, `Scaffold plan: ${description}`, planId);

      try {
        let knowledgeContext = "";
        let knowledgeSources: string[] = [];

        if (templateId) {
          // from-template mode: load the KB doc from disk and include it in the prompt
          const templatePath = join(process.cwd(), "knowledge-base", "scaffolding", templateId);
          if (!existsSync(templatePath)) {
            const errMsg = `Scaffolding template not found: ${templateId}`;
            await updateScaffoldPlanStatus(planId, "failed", { error: errMsg } as never);
            await logWorkFailure(workId, errMsg);
            return;
          }
          const templateContent = readFileSync(templatePath, "utf-8");
          knowledgeContext = `\n\n## Scaffolding Template\n\nUse this template as the basis for your plan:\n\n${templateContent}`;
          knowledgeSources = [templateId];
        } else {
          // natural-language / guided mode: vector search the KB (graceful — continue without if fails)
          try {
            const store = new ChromaDBStore();
            const knowledgeDocs = await store.search(searchQuery, 8);
            knowledgeSources = knowledgeDocs.map((d) => d.metadata.filename);
            if (knowledgeDocs.length > 0) {
              const docsText = knowledgeDocs
                .map((d) => `### ${d.metadata.filename}\n${d.content}`)
                .join("\n\n---\n\n");
              knowledgeContext = `\n\n## Knowledge Base Context\n\nUse these best-practice documents to inform your plan:\n\n${docsText}`;
            }
          } catch (kbErr) {
            console.warn("[scaffold/plan] ChromaDB search failed, continuing without KB context:", kbErr);
            knowledgeSources = [];
          }
        }

        if (taskRunner.isCancelled(planId)) return;

        // Build the natural language prompt for the agent
        const prompt = `You are Repo-Ninja, an expert at scaffolding new GitHub repositories.

Based on the following user request, plan the repository structure. Do NOT create the repository — only plan it.

## User Request

Mode: ${body.mode}
Description: ${description}
${repoName ? `Preferred repo name: ${repoName}` : ""}
${body.options ? `Options: ${JSON.stringify(body.options)}` : ""}
${extraDescription ? `Additional requirements: ${extraDescription}` : ""}
${knowledgeContext}

## Instructions

1. Suggest a repository name (kebab-case) if one was not provided.
2. Write a short description of what the repository will contain.
3. Plan a complete file structure with every file that should be created, including configuration files, source code, tests, CI/CD, and documentation.
4. For each file, include its path and a brief description of its purpose.
5. List the best practices you are applying (e.g., "TypeScript strict mode", "ESLint + Prettier", "Docker multi-stage build").
6. List which knowledge base documents informed your plan (if any).

## Response Format

You MUST respond with ONLY a single valid JSON object (no markdown fences, no extra text) in this exact shape:

{
  "repoName": "suggested-repo-name",
  "description": "Short description of the repository",
  "structure": [
    { "path": "src/index.ts", "description": "Application entry point" },
    { "path": "package.json", "description": "Node.js package manifest" }
  ],
  "bestPracticesApplied": ["TypeScript strict mode", "ESLint configuration"],
  "knowledgeSources": [${knowledgeSources.map((s) => `"${s}"`).join(", ")}]
}`;

        // Generate scaffold plan via agentWithGitHub
        const response = await agentWithGitHub(
          accessToken,
          prompt,
          (event) => {
            // Log progress events for debugging; no streaming needed for background task
            if (event.type === "tool_call") {
              console.log(`[scaffold/plan] Agent tool call: ${event.toolName}`);
            } else if (event.type === "error") {
              console.error(`[scaffold/plan] Agent error: ${event.detail}`);
            }
          },
          180_000
        );

        if (taskRunner.isCancelled(planId)) return;

        // Parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (!plan) {
          const errMsg = "Agent returned an invalid response — no JSON scaffold plan found.";
          await updateScaffoldPlanStatus(planId, "failed", { error: errMsg } as never);
          await logWorkFailure(workId, errMsg);
          return;
        }

        // Carry forward the user-provided repo name if the agent didn't suggest one
        if (repoName && !plan.repoName) {
          plan.repoName = repoName;
        }

        await updateScaffoldPlanStatus(planId, "completed", plan, knowledgeSources);
        await logWorkComplete(workId, { planId, fileCount: plan.structure?.length ?? 0 });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await updateScaffoldPlanStatus(planId, "failed", { error: message } as never);
        await logWorkFailure(workId, message);
      }
    });

    // Return immediately (HTTP 202 Accepted)
    return NextResponse.json({ planId, status: "generating" }, { status: 202 });
  } catch (err) {
    console.error("[scaffold/plan] POST error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint to poll plan status
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const planId = url.searchParams.get("planId");
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

    const { getScaffoldPlan } = await import("@/lib/db/dal");
    const record = await getScaffoldPlan(planId);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const response: Record<string, unknown> = {
      planId: record.id,
      status: record.status,
      plan: record.plan,
      knowledgeSources: record.knowledgeSources,
    };

    // Include error message if the plan failed
    if (record.status === "failed" && record.plan && typeof record.plan === "object" && "error" in record.plan) {
      response.error = (record.plan as { error?: string }).error;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[scaffold/plan] GET error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
