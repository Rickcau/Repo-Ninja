import type { ReviewReport, AuditReport } from "@/lib/types";

/**
 * Simple in-memory store for review/audit reports.
 * Reports are stored in a Map keyed by report ID.
 * In production, this would be replaced with a persistent store.
 */
const reports = new Map<string, ReviewReport | AuditReport>();

export function saveReport(id: string, report: ReviewReport | AuditReport): void {
  reports.set(id, report);
}

export function getReport(id: string): ReviewReport | AuditReport | undefined {
  return reports.get(id);
}

export function listReports(): (ReviewReport | AuditReport)[] {
  return Array.from(reports.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
