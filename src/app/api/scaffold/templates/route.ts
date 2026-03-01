import { NextResponse } from "next/server";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

export interface ScaffoldTemplate {
  id: string;
  filename: string;
  title: string;
  description: string;
  preview: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const dir = join(process.cwd(), "knowledge-base", "scaffolding");
    if (!existsSync(dir)) {
      return NextResponse.json({ templates: [] });
    }

    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

    const templates: ScaffoldTemplate[] = files.map((file) => {
      const filePath = join(dir, file);
      const content = readFileSync(filePath, "utf-8");
      const stat = statSync(filePath);
      const lines = content.split("\n");

      const title = lines[0]?.replace(/^#\s*/, "").trim() || file.replace(".md", "");

      // Find first non-heading, non-empty paragraph as description
      const description =
        lines.find((l, i) => i > 0 && l.trim() && !l.startsWith("#") && !l.startsWith("```"))
          ?.trim()
          .slice(0, 200) ?? "";

      // Preview: first ~600 chars of content
      const preview = content.slice(0, 600);

      return {
        id: file,
        filename: file,
        title,
        description,
        preview,
        updatedAt: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[scaffold/templates] GET error:", err);
    return NextResponse.json({ templates: [] });
  }
}
