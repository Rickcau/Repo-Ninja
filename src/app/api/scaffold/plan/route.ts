import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildScaffoldPrompt } from "@/lib/copilot-sdk/prompts";
import type { ScaffoldRequest } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const response = await askCopilot(session.accessToken, prompt);

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
