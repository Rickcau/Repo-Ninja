import { NextResponse } from "next/server";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { readdir } from "fs/promises";
import { join } from "path";

const KB_DIR = join(process.cwd(), "knowledge-base");

export async function GET() {
  try {
    const store = new ChromaDBStore();
    const status = await store.getStatus();

    // Count markdown files on disk
    let diskDocs: string[] = [];
    try {
      const entries = await readdir(KB_DIR, { recursive: true }) as string[];
      diskDocs = entries.filter((f: string) => f.endsWith(".md"));
    } catch {
      // KB directory might not exist
    }

    const totalChunks = status.documentCount ?? 0;
    const totalDiskDocs = diskDocs.length;

    // Approximate: if chunks exist but no disk docs, or disk docs but no chunks
    const outOfSync: string[] = [];
    if (totalDiskDocs > 0 && totalChunks === 0) {
      outOfSync.push(...diskDocs.map((f: string) => `${f} (not indexed)`));
    }

    return NextResponse.json({
      healthy: status.connected && outOfSync.length === 0,
      connected: status.connected,
      totalChunks,
      totalDiskDocs,
      outOfSync,
    });
  } catch (err) {
    return NextResponse.json({
      healthy: false,
      connected: false,
      totalChunks: 0,
      totalDiskDocs: 0,
      outOfSync: [],
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
