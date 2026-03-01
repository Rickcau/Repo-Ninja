import { NextResponse } from "next/server";
import { listReviewReports, listAuditReports } from "@/lib/db/dal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const repo = searchParams.get("repo") || undefined;

  const [reviews, audits] = await Promise.all([
    listReviewReports(repo ? { repo } : undefined, { page, pageSize }),
    listAuditReports(repo ? { repo } : undefined, { page, pageSize }),
  ]);

  // Merge and sort by date
  const allItems = [
    ...reviews.items.map((r) => ({ ...r, reportType: "review" as const })),
    ...audits.items.map((a) => ({ ...a, reportType: "audit" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    items: allItems.slice(0, pageSize),
    total: reviews.total + audits.total,
  });
}
