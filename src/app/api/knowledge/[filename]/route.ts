import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import type { KnowledgeCategory } from "@/lib/types";

const KNOWLEDGE_BASE_PATH = join(process.cwd(), "knowledge-base");

const CATEGORIES = [
  "best-practices",
  "scaffolding",
  "review-instructions",
  "agent-instructions",
  "architecture-patterns",
  "ci-cd",
  "responsible-ai",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  for (const category of CATEGORIES) {
    const filePath = join(KNOWLEDGE_BASE_PATH, category, filename);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      return NextResponse.json({ filename, category, content });
    }
  }

  return NextResponse.json({ error: "Document not found" }, { status: 404 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const { category, content } = (await request.json()) as {
    category: KnowledgeCategory;
    content: string;
  };

  const filePath = join(KNOWLEDGE_BASE_PATH, category, filename);
  if (!existsSync(join(KNOWLEDGE_BASE_PATH, category))) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  writeFileSync(filePath, content, "utf-8");

  const store = new ChromaDBStore();
  const title = content.split("\n")[0]?.replace(/^#\s*/, "") || filename;
  await store.upsert(filename, content, {
    category,
    filename,
    title,
    tags: [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  for (const category of CATEGORIES) {
    const filePath = join(KNOWLEDGE_BASE_PATH, category, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      const store = new ChromaDBStore();
      await store.delete(filename);
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: "Document not found" }, { status: 404 });
}
