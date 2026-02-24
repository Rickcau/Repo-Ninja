import { NextResponse } from "next/server";

export async function GET() {
  const chromadbUrl = process.env.CHROMADB_URL || "http://localhost:8000";
  let chromadbStatus = "unknown";

  try {
    const res = await fetch(`${chromadbUrl}/api/v1/heartbeat`, { signal: AbortSignal.timeout(3000) });
    chromadbStatus = res.ok ? "connected" : "error";
  } catch {
    chromadbStatus = "disconnected";
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      chromadb: chromadbStatus,
    },
  });
}
