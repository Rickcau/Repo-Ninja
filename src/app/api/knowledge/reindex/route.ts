import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import type { KnowledgeCategory } from "@/lib/types";

const KNOWLEDGE_BASE_PATH = join(process.cwd(), "knowledge-base");

export async function POST() {
  const store = new ChromaDBStore();
  await store.reindexAll();

  const categories = [
    "best-practices",
    "scaffolding",
    "review-instructions",
    "agent-instructions",
    "architecture-patterns",
    "ci-cd",
    "responsible-ai",
  ];
  let indexed = 0;

  for (const category of categories) {
    const dirPath = join(KNOWLEDGE_BASE_PATH, category);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = readFileSync(join(dirPath, file), "utf-8");
      const title = content.split("\n")[0]?.replace(/^#\s*/, "") || file;

      await store.upsert(file, content, {
        category: category as KnowledgeCategory,
        filename: file,
        title,
        tags: [],
        updatedAt: new Date().toISOString(),
      });
      indexed++;
    }
  }

  return NextResponse.json({ success: true, indexed });
}
