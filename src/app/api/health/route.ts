import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { taskRunner } from "@/lib/services/task-runner";

export async function GET() {
  const chromadbUrl = process.env.CHROMADB_URL || "http://localhost:8000";
  let chromadbStatus = "unknown";

  try {
    const res = await fetch(`${chromadbUrl}/api/v2/healthcheck`, { signal: AbortSignal.timeout(3000) });
    chromadbStatus = res.ok ? "connected" : "error";
  } catch {
    chromadbStatus = "disconnected";
  }

  // Database (Prisma/SQLite) health
  let dbStatus = "unknown";
  let dbCounts: Record<string, number> = {};
  try {
    const [tasks, reviews, audits, scaffolds, history] = await Promise.all([
      prisma.agentTask.count(),
      prisma.reviewReport.count(),
      prisma.auditReport.count(),
      prisma.scaffoldPlan.count(),
      prisma.workHistory.count(),
    ]);
    dbStatus = "connected";
    dbCounts = { tasks, reviews, audits, scaffolds, history };
  } catch {
    dbStatus = "error";
  }

  // TaskRunner stats
  const runnerStats = taskRunner.getStats();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      chromadb: chromadbStatus,
      database: dbStatus,
    },
    database: dbCounts,
    taskRunner: runnerStats,
  });
}
