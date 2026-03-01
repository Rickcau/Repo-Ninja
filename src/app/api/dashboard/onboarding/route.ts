import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOnboardingStatus } from "@/lib/db/dal";
import { ChromaDBStore } from "@/lib/chromadb/chromadb-store";

export async function GET() {
  const session = await getServerSession(authOptions);
  const githubConnected = !!session?.accessToken;

  let kbIndexed = false;
  try {
    const store = new ChromaDBStore();
    const kbStatus = await store.getStatus();
    kbIndexed = kbStatus.documentCount > 0;
  } catch {
    // ChromaDB not available
  }

  const dbStatus = await getOnboardingStatus();

  const steps = [
    { id: "connect-github", label: "Connect GitHub", complete: githubConnected },
    { id: "setup-kb", label: "Set Up Knowledge Base", complete: kbIndexed },
    { id: "index-docs", label: "Index Documents", complete: kbIndexed },
    { id: "first-review", label: "Run First Review", complete: dbStatus.hasReview },
    { id: "scaffold-repo", label: "Scaffold a Repo", complete: dbStatus.hasScaffold },
    { id: "deploy-agent", label: "Deploy First Agent", complete: dbStatus.hasAgent },
  ];

  return NextResponse.json({ steps });
}
