import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWorkHistory, clearWorkHistory, type ActionType } from "@/lib/db/dal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const actionType = searchParams.get("actionType") as ActionType | null;
  const repo = searchParams.get("repo") || undefined;

  const result = await listWorkHistory(
    { actionType: actionType || undefined, repo },
    { page, pageSize }
  );

  return NextResponse.json(result);
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = await clearWorkHistory();
  return NextResponse.json({ deleted });
}
