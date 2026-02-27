import { NextResponse } from "next/server";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

const AGENT_TYPES = [
  {
    id: "issue-solver",
    label: "Issue Solver",
    description:
      "Reads a GitHub issue, queries the knowledge base for relevant patterns, and generates a fix as a pull request.",
    searchQuery: "agent instructions issue solving",
  },
  {
    id: "code-writer",
    label: "Code Writer",
    description:
      "Takes a natural-language description and scaffolds code grounded in your team's standards and templates.",
    searchQuery: "agent instructions code writing scaffolding",
  },
];

export async function GET() {
  try {
    const store = new ChromaDBStore();
    const types = await Promise.all(
      AGENT_TYPES.map(async (agentType) => {
        const docs = await store.search(agentType.searchQuery, 3);
        return {
          id: agentType.id,
          label: agentType.label,
          description: agentType.description,
          kbDocs: docs.map((d) => ({
            name: d.metadata.filename,
            section: d.metadata.title || d.metadata.filename,
            score: d.score,
          })),
        };
      })
    );
    return NextResponse.json({ types });
  } catch {
    // Fallback if ChromaDB is not available
    return NextResponse.json({
      types: AGENT_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        kbDocs: [],
      })),
    });
  }
}
