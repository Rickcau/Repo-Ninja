import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildScaffoldPrompt } from "@/lib/copilot-sdk/prompts";
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
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const planId = nanoid();
    const accessToken = session.accessToken;
    const userEmail = session.user?.email ?? undefined;
    const description = body.description || searchQuery;
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

    // Enqueue background work
    taskRunner.enqueue(planId, async () => {
      const workId = await logWorkStart(userEmail, "scaffold-plan", undefined, `Scaffold plan: ${description}`, planId);

      try {
        // Search knowledge base
        const store = new ChromaDBStore();
        const knowledgeDocs = await store.search(searchQuery, 8);
        const knowledgeSources = knowledgeDocs.map((d) => d.metadata.filename);

        if (taskRunner.isCancelled(planId)) return;

        // Generate scaffold plan via Copilot SDK
        const prompt = buildScaffoldPrompt(description, knowledgeDocs);
        const response = await askCopilot(accessToken, prompt, {
          systemMessage: "You are Repo-Ninja, an expert at scaffolding new GitHub repositories. Always respond with valid JSON.",
          timeoutMs: 180_000,
        });

        if (taskRunner.isCancelled(planId)) return;

        // Parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (!plan) {
          const errMsg = "Copilot returned an invalid response — no JSON scaffold plan found.";
          await updateScaffoldPlanStatus(planId, "failed", { error: errMsg } as never);
          await logWorkFailure(workId, errMsg);
          return;
        }

        // Carry forward the user-provided repo name if Copilot didn't suggest one
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
