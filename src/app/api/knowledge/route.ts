import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import type { KnowledgeCategory, KnowledgeDocument, DocMetadata } from "@/lib/types";

const KNOWLEDGE_BASE_PATH = join(process.cwd(), "knowledge-base");

const CATEGORY_DIRS: Record<string, KnowledgeCategory> = {
  "best-practices": "best-practices",
  "scaffolding": "scaffolding",
  "review-instructions": "review-instructions",
  "agent-instructions": "agent-instructions",
  "architecture-patterns": "architecture-patterns",
  "ci-cd": "ci-cd",
  "responsible-ai": "responsible-ai",
};

function scanKnowledgeBase(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];
  for (const [dir, category] of Object.entries(CATEGORY_DIRS)) {
    const dirPath = join(KNOWLEDGE_BASE_PATH, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, "utf-8");
      const stat = statSync(filePath);
      const title = content.split("\n")[0]?.replace(/^#\s*/, "") || file;

      docs.push({
        id: `${category}/${file}`,
        filename: file,
        category,
        content,
        metadata: {
          category,
          filename: file,
          title,
          tags: [],
          updatedAt: stat.mtime.toISOString(),
        },
      });
    }
  }
  return docs;
}

export async function GET() {
  const docs = scanKnowledgeBase();
  return NextResponse.json({ documents: docs.map(({ content, ...rest }) => rest) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { filename, category, content } = body as {
    filename: string;
    category: KnowledgeCategory;
    content: string;
  };

  if (!filename || !category || !content) {
    return NextResponse.json({ error: "filename, category, and content are required" }, { status: 400 });
  }

  const dirPath = join(KNOWLEDGE_BASE_PATH, category);
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

  const filePath = join(dirPath, filename.endsWith(".md") ? filename : `${filename}.md`);
  writeFileSync(filePath, content, "utf-8");

  // Index in ChromaDB
  const store = new ChromaDBStore();
  const title = content.split("\n")[0]?.replace(/^#\s*/, "") || filename;
  await store.upsert(filename, content, {
    category,
    filename,
    title,
    tags: [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, id: `${category}/${filename}` });
}
