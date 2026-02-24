import { NextResponse } from "next/server";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

export async function GET() {
  const store = new ChromaDBStore();
  const status = await store.getStatus();
  return NextResponse.json(status);
}
