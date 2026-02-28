/**
 * Report store — now backed by SQLite via the DAL.
 * Replaces the previous in-memory Map implementation.
 */
import {
  saveReviewReport as dalSaveReview,
  getReviewReport as dalGetReview,
  listReviewReports as dalListReviews,
  saveAuditReport as dalSaveAudit,
  getAuditReport as dalGetAudit,
} from "@/lib/db/dal";
import type { ReviewReport, AuditReport } from "@/lib/types";

export async function saveReport(id: string, report: (ReviewReport | AuditReport) & { status?: string }): Promise<void> {
  if ("overallScore" in report) {
    await dalSaveReview(report as ReviewReport & { status?: string });
  } else {
    await dalSaveAudit(report as AuditReport & { status?: string });
  }
}

export async function getReport(id: string): Promise<(ReviewReport | AuditReport) | undefined> {
  const review = await dalGetReview(id);
  if (review) return review;
  const audit = await dalGetAudit(id);
  if (audit) return audit;
  return undefined;
}

export async function listReports(): Promise<(ReviewReport | AuditReport)[]> {
  const reviews = await dalListReviews(undefined, { page: 1, pageSize: 50 });
  return reviews.items;
}
