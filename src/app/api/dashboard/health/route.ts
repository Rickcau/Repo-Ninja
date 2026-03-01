import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";
import { getOctokit } from "@/lib/github/octokit";
import { listReviewReports } from "@/lib/db/dal";

export async function GET() {
  const session = await getServerSession(authOptions);

  // ChromaDB status
  let chromaDb = { status: "disconnected" as string, chunkCount: 0 };
  try {
    const store = new ChromaDBStore();
    const s = await store.getStatus();
    chromaDb = { status: s.connected ? "ok" : "disconnected", chunkCount: s.documentCount };
  } catch {
    chromaDb = { status: "error", chunkCount: 0 };
  }

  // GitHub API rate limit
  let githubApi = { used: 0, limit: 5000 };
  if (session?.accessToken) {
    try {
      const octokit = getOctokit(session.accessToken);
      const { data } = await octokit.rest.rateLimit.get();
      githubApi = { used: data.rate.used, limit: data.rate.limit };
    } catch {
      // Ignore rate limit errors
    }
  }

  // Recent reviews
  const { items: recentReviews } = await listReviewReports(undefined, { page: 1, pageSize: 3 });

  return NextResponse.json({ chromaDb, githubApi, recentReviews });
}
