import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db/dal";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    // Get KB document count
    let kbDocumentCount = 0;
    try {
      const store = new ChromaDBStore();
      const kbStatus = await store.getStatus();
      kbDocumentCount = kbStatus.documentCount;
    } catch {
      // ChromaDB may not be available
    }
    return NextResponse.json({ ...stats, kbDocuments: kbDocumentCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
