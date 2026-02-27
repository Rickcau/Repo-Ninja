import { nanoid } from "nanoid";
import { getDb } from "./schema";
import type {
  AgentTask,
  AgentTaskType,
  AgentTaskStatus,
  AgentTaskResult,
  ReviewReport,
  AuditReport,
  ScaffoldPlan,
} from "@/lib/types";

// ─── Pagination ────────────────────────────────────────────────────
export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

interface PaginationOpts {
  page?: number;
  pageSize?: number;
}

function paginate(opts?: PaginationOpts) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

// ─── Agent Tasks ───────────────────────────────────────────────────

function rowToAgentTask(row: Record<string, unknown>): AgentTask {
  return {
    id: row.id as string,
    type: row.type as AgentTaskType,
    status: row.status as AgentTaskStatus,
    repo: row.repo as string,
    description: row.description as string,
    branch: (row.branch as string) || undefined,
    prUrl: (row.pr_url as string) || undefined,
    progress: JSON.parse((row.progress as string) || "[]"),
    result: row.result ? JSON.parse(row.result as string) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createAgentTask(
  type: AgentTaskType,
  repo: string,
  description: string,
  userId?: string
): Promise<AgentTask> {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO agent_tasks (id, type, status, repo, description, progress, user_id, created_at, updated_at)
     VALUES (?, ?, 'queued', ?, ?, '[]', ?, ?, ?)`
  ).run(id, type, repo, description, userId ?? null, now, now);
  return rowToAgentTask(
    db.prepare("SELECT * FROM agent_tasks WHERE id = ?").get(id) as Record<string, unknown>
  );
}

export async function getAgentTask(id: string): Promise<AgentTask | null> {
  const row = getDb().prepare("SELECT * FROM agent_tasks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToAgentTask(row) : null;
}

export async function updateAgentTask(
  id: string,
  updates: Partial<Pick<AgentTask, "status" | "branch" | "prUrl" | "result">> & {
    progressMessage?: string;
  }
): Promise<AgentTask | null> {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM agent_tasks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const progress: string[] = JSON.parse((existing.progress as string) || "[]");
  if (updates.progressMessage) progress.push(updates.progressMessage);

  db.prepare(
    `UPDATE agent_tasks SET
       status = COALESCE(?, status),
       branch = COALESCE(?, branch),
       pr_url = COALESCE(?, pr_url),
       progress = ?,
       result = COALESCE(?, result),
       updated_at = ?
     WHERE id = ?`
  ).run(
    updates.status ?? null,
    updates.branch ?? null,
    updates.prUrl ?? null,
    JSON.stringify(progress),
    updates.result ? JSON.stringify(updates.result) : null,
    new Date().toISOString(),
    id
  );
  return getAgentTask(id);
}

export async function listAgentTasks(
  filter?: { type?: AgentTaskType; status?: AgentTaskStatus },
  pagination?: PaginationOpts
): Promise<PaginatedResult<AgentTask>> {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.type) { conditions.push("type = ?"); params.push(filter.type); }
  if (filter?.status) { conditions.push("status = ?"); params.push(filter.status); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { limit, offset } = paginate(pagination);

  const total = (db.prepare(`SELECT COUNT(*) as count FROM agent_tasks ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(
    `SELECT * FROM agent_tasks ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];

  return { items: rows.map(rowToAgentTask), total };
}

// ─── Review Reports ────────────────────────────────────────────────

function rowToReviewReport(row: Record<string, unknown>): ReviewReport & { status?: string } {
  return {
    id: row.id as string,
    repo: row.repo as string,
    reviewTypes: JSON.parse((row.review_types as string) || "[]"),
    overallScore: row.overall_score as number,
    categoryScores: JSON.parse((row.category_scores as string) || "[]"),
    findings: JSON.parse((row.findings as string) || "[]"),
    status: (row.status as string) || "completed",
    createdAt: row.created_at as string,
  };
}

export async function saveReviewReport(
  report: ReviewReport & { status?: string },
  userId?: string
): Promise<void> {
  getDb().prepare(
    `INSERT OR REPLACE INTO review_reports (id, repo, review_types, overall_score, category_scores, findings, status, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    report.id,
    report.repo,
    JSON.stringify(report.reviewTypes),
    report.overallScore,
    JSON.stringify(report.categoryScores),
    JSON.stringify(report.findings),
    report.status ?? "completed",
    userId ?? null,
    report.createdAt
  );
}

export async function getReviewReport(id: string): Promise<(ReviewReport & { status?: string }) | null> {
  const row = getDb().prepare("SELECT * FROM review_reports WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToReviewReport(row) : null;
}

export async function listReviewReports(
  filter?: { repo?: string },
  pagination?: PaginationOpts
): Promise<PaginatedResult<ReviewReport & { status?: string }>> {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.repo) { conditions.push("repo = ?"); params.push(filter.repo); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { limit, offset } = paginate(pagination);
  const total = (db.prepare(`SELECT COUNT(*) as count FROM review_reports ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(
    `SELECT * FROM review_reports ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];
  return { items: rows.map(rowToReviewReport), total };
}

// ─── Audit Reports ─────────────────────────────────────────────────

function rowToAuditReport(row: Record<string, unknown>): AuditReport & { status?: string } {
  return {
    id: row.id as string,
    repo: row.repo as string,
    complianceScore: row.compliance_score as number,
    checks: JSON.parse((row.checks as string) || "[]"),
    recommendations: JSON.parse((row.recommendations as string) || "[]"),
    status: (row.status as string) || "completed",
    createdAt: row.created_at as string,
  };
}

export async function saveAuditReport(
  report: AuditReport & { status?: string },
  userId?: string
): Promise<void> {
  getDb().prepare(
    `INSERT OR REPLACE INTO audit_reports (id, repo, compliance_score, checks, recommendations, status, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    report.id,
    report.repo,
    report.complianceScore,
    JSON.stringify(report.checks),
    JSON.stringify(report.recommendations),
    report.status ?? "completed",
    userId ?? null,
    report.createdAt
  );
}

export async function getAuditReport(id: string): Promise<(AuditReport & { status?: string }) | null> {
  const row = getDb().prepare("SELECT * FROM audit_reports WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToAuditReport(row) : null;
}

export async function listAuditReports(
  filter?: { repo?: string },
  pagination?: PaginationOpts
): Promise<PaginatedResult<AuditReport & { status?: string }>> {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.repo) { conditions.push("repo = ?"); params.push(filter.repo); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { limit, offset } = paginate(pagination);
  const total = (db.prepare(`SELECT COUNT(*) as count FROM audit_reports ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(
    `SELECT * FROM audit_reports ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];
  return { items: rows.map(rowToAuditReport), total };
}

// ─── Work History ──────────────────────────────────────────────────

export type ActionType =
  | "code-review"
  | "best-practices-audit"
  | "scaffold-plan"
  | "scaffold-create"
  | "agent-issue-solver"
  | "agent-code-writer"
  | "kb-edit"
  | "kb-reindex";

export interface WorkHistoryEntry {
  id: string;
  userId?: string;
  actionType: ActionType;
  entityId?: string;
  repo?: string;
  summary: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

function rowToWorkHistory(row: Record<string, unknown>): WorkHistoryEntry {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || undefined,
    actionType: row.action_type as ActionType,
    entityId: (row.entity_id as string) || undefined,
    repo: (row.repo as string) || undefined,
    summary: row.summary as string,
    status: row.status as string,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) || undefined,
    metadata: JSON.parse((row.metadata as string) || "{}"),
  };
}

export async function logWorkStart(
  userId: string | undefined,
  actionType: ActionType,
  repo: string | undefined,
  summary: string,
  entityId?: string
): Promise<string> {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO work_history (id, user_id, action_type, entity_id, repo, summary, status, started_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?, 'started', ?, '{}')`
  ).run(id, userId ?? null, actionType, entityId ?? null, repo ?? null, summary, now);
  return id;
}

export async function logWorkComplete(workId: string, metadata?: Record<string, unknown>): Promise<void> {
  getDb().prepare(
    `UPDATE work_history SET status = 'completed', completed_at = ?, metadata = COALESCE(?, metadata) WHERE id = ?`
  ).run(new Date().toISOString(), metadata ? JSON.stringify(metadata) : null, workId);
}

export async function logWorkFailure(workId: string, error: string): Promise<void> {
  getDb().prepare(
    `UPDATE work_history SET status = 'failed', completed_at = ?, metadata = json_set(metadata, '$.error', ?) WHERE id = ?`
  ).run(new Date().toISOString(), error, workId);
}

export async function listWorkHistory(
  filter?: { userId?: string; actionType?: ActionType; repo?: string },
  pagination?: PaginationOpts
): Promise<PaginatedResult<WorkHistoryEntry>> {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.userId) { conditions.push("user_id = ?"); params.push(filter.userId); }
  if (filter?.actionType) { conditions.push("action_type = ?"); params.push(filter.actionType); }
  if (filter?.repo) { conditions.push("repo = ?"); params.push(filter.repo); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { limit, offset } = paginate(pagination);
  const total = (db.prepare(`SELECT COUNT(*) as count FROM work_history ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(
    `SELECT * FROM work_history ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];
  return { items: rows.map(rowToWorkHistory), total };
}

export async function getWorkHistoryEntry(id: string): Promise<WorkHistoryEntry | null> {
  const row = getDb().prepare("SELECT * FROM work_history WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToWorkHistory(row) : null;
}

// ─── Scaffold Plans ────────────────────────────────────────────────

export interface ScaffoldPlanRecord {
  id: string;
  repo?: string;
  mode: string;
  description?: string;
  plan: ScaffoldPlan;
  status: string;
  knowledgeSources: string[];
  userId?: string;
  createdAt: string;
}

function rowToScaffoldPlan(row: Record<string, unknown>): ScaffoldPlanRecord {
  return {
    id: row.id as string,
    repo: (row.repo as string) || undefined,
    mode: row.mode as string,
    description: (row.description as string) || undefined,
    plan: JSON.parse((row.plan as string) || "{}"),
    status: row.status as string,
    knowledgeSources: JSON.parse((row.knowledge_sources as string) || "[]"),
    userId: (row.user_id as string) || undefined,
    createdAt: row.created_at as string,
  };
}

export async function saveScaffoldPlan(
  id: string,
  mode: string,
  description: string | undefined,
  plan: ScaffoldPlan,
  knowledgeSources: string[],
  status: string,
  userId?: string
): Promise<void> {
  getDb().prepare(
    `INSERT OR REPLACE INTO scaffold_plans (id, mode, description, plan, knowledge_sources, status, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, mode, description ?? null,
    JSON.stringify(plan), JSON.stringify(knowledgeSources),
    status, userId ?? null, new Date().toISOString()
  );
}

export async function getScaffoldPlan(id: string): Promise<ScaffoldPlanRecord | null> {
  const row = getDb().prepare("SELECT * FROM scaffold_plans WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToScaffoldPlan(row) : null;
}

export async function updateScaffoldPlanStatus(
  id: string,
  status: string,
  plan?: ScaffoldPlan,
  knowledgeSources?: string[]
): Promise<void> {
  const sets = ["status = ?"];
  const params: unknown[] = [status];
  if (plan) { sets.push("plan = ?"); params.push(JSON.stringify(plan)); }
  if (knowledgeSources) { sets.push("knowledge_sources = ?"); params.push(JSON.stringify(knowledgeSources)); }
  params.push(id);
  getDb().prepare(`UPDATE scaffold_plans SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

export async function listScaffoldPlans(
  pagination?: PaginationOpts
): Promise<PaginatedResult<ScaffoldPlanRecord>> {
  const db = getDb();
  const { limit, offset } = paginate(pagination);
  const total = (db.prepare("SELECT COUNT(*) as count FROM scaffold_plans").get() as { count: number }).count;
  const rows = db.prepare(
    "SELECT * FROM scaffold_plans ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset) as Record<string, unknown>[];
  return { items: rows.map(rowToScaffoldPlan), total };
}

// ─── Dashboard Stats ───────────────────────────────────────────────

export interface DashboardStats {
  activeAgents: number;
  completedTasks: number;
  totalTasks: number;
  totalReviews: number;
  totalAudits: number;
  totalScaffolds: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();
  const tasks = db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM agent_tasks`
  ).get() as { total: number; running: number; completed: number };
  const reviews = (db.prepare("SELECT COUNT(*) as count FROM review_reports").get() as { count: number }).count;
  const audits = (db.prepare("SELECT COUNT(*) as count FROM audit_reports").get() as { count: number }).count;
  const scaffolds = (db.prepare("SELECT COUNT(*) as count FROM scaffold_plans").get() as { count: number }).count;

  return {
    activeAgents: tasks.running ?? 0,
    completedTasks: tasks.completed ?? 0,
    totalTasks: tasks.total ?? 0,
    totalReviews: reviews,
    totalAudits: audits,
    totalScaffolds: scaffolds,
  };
}

// ─── Onboarding Detection ──────────────────────────────────────────

export async function getOnboardingStatus(): Promise<{
  hasReview: boolean;
  hasAudit: boolean;
  hasScaffold: boolean;
  hasAgent: boolean;
}> {
  const db = getDb();
  return {
    hasReview: ((db.prepare("SELECT COUNT(*) as c FROM review_reports").get() as { c: number }).c) > 0,
    hasAudit: ((db.prepare("SELECT COUNT(*) as c FROM audit_reports").get() as { c: number }).c) > 0,
    hasScaffold: ((db.prepare("SELECT COUNT(*) as c FROM scaffold_plans").get() as { c: number }).c) > 0,
    hasAgent: ((db.prepare("SELECT COUNT(*) as c FROM agent_tasks").get() as { c: number }).c) > 0,
  };
}
