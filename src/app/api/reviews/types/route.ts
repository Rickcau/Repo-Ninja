import { NextResponse } from "next/server";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

export async function GET() {
  try {
    const store = new ChromaDBStore();

    const reviewTypes = [
      { id: "security", label: "Security", description: "Checks for vulnerabilities, dependency issues, and authentication flaws", searchTerm: "security review" },
      { id: "performance", label: "Performance", description: "Analyzes bottlenecks, memory leaks, and optimization opportunities", searchTerm: "performance review" },
      { id: "accessibility", label: "Accessibility", description: "Validates WCAG compliance, ARIA usage, and keyboard navigation", searchTerm: "accessibility review" },
      { id: "general", label: "General", description: "Code style, naming conventions, architecture, and maintainability", searchTerm: "best practices code review" },
    ];

    const typesWithDocs = await Promise.all(
      reviewTypes.map(async (rt) => {
        try {
          const docs = await store.search(rt.searchTerm, 4);
          return {
            id: rt.id,
            label: rt.label,
            description: rt.description,
            kbDocuments: docs.map((d) => d.metadata.filename),
          };
        } catch {
          return { id: rt.id, label: rt.label, description: rt.description, kbDocuments: [] };
        }
      })
    );

    return NextResponse.json({ types: typesWithDocs });
  } catch {
    return NextResponse.json({ types: [] });
  }
}
