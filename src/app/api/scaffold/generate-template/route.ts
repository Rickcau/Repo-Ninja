import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { askCopilot } from "@/lib/copilot-sdk/client";
import { buildGenerateTemplatePrompt } from "@/lib/copilot-sdk/prompts";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      description: string;
      filename?: string;
      save?: boolean;
    };

    if (!body.description?.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const userEmail = session.user?.email ?? undefined;
    const workId = await logWorkStart(
      userEmail,
      "kb-edit",
      undefined,
      `Generate scaffolding template: ${body.description.slice(0, 80)}`
    );

    try {
      const prompt = buildGenerateTemplatePrompt(body.description);
      const content = await askCopilot(session.accessToken, prompt, {
        systemMessage:
          "You are Repo-Ninja, a scaffolding expert. Generate detailed scaffolding template markdown documents. Only output the markdown — no commentary before or after.",
        timeoutMs: 120_000,
      });

      // Derive a filename if not provided
      const rawFilename = body.filename?.trim() || deriveFilename(body.description);
      const filename = rawFilename.endsWith(".md") ? rawFilename : `${rawFilename}.md`;

      // Optionally save to knowledge base
      if (body.save) {
        const dir = join(process.cwd(), "knowledge-base", "scaffolding");
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, filename), content, "utf-8");

        // Index in ChromaDB
        const title = content.split("\n")[0]?.replace(/^#\s*/, "") || filename;
        const store = new ChromaDBStore();
        await store.upsert(filename, content, {
          category: "scaffolding",
          filename,
          title,
          tags: [],
          updatedAt: new Date().toISOString(),
        });
      }

      await logWorkComplete(workId, { filename, saved: body.save ?? false });

      return NextResponse.json({ content, filename });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await logWorkFailure(workId, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    console.error("[scaffold/generate-template] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function deriveFilename(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
