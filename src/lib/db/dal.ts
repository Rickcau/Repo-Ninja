import { prisma } from "./prisma";
import type {
  AgentTask,
  AgentTaskType,
  AgentTaskStatus,
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
  return { take: pageSize, skip: (page - 1) * pageSize };
}

// ─── Agent Tasks ───────────────────────────────────────────────────

function dbToAgentTask(row: {
  id: string;
  type: string;
  status: string;
  repo: string;
  description: string;
  branch: string | null;
  prUrl: string | null;
  progress: string;
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentTask {
  return {
    id: row.id,
    type: row.type as AgentTaskType,
    status: row.status as AgentTaskStatus,
    repo: row.repo,
    description: row.description,
    branch: row.branch ?? undefined,
    prUrl: row.prUrl ?? undefined,
    progress: JSON.parse(row.progress),
    result: row.result ? JSON.parse(row.result) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createAgentTask(
  type: AgentTaskType,
  repo: string,
  description: string,
  userId?: string
): Promise<AgentTask> {
  const row = await prisma.agentTask.create({
    data: {
      type,
      repo,
      description,
      userId: userId ?? null,
    },
  });
  return dbToAgentTask(row);
}

export async function getAgentTask(id: string): Promise<AgentTask | null> {
  const row = await prisma.agentTask.findUnique({ where: { id } });
  return row ? dbToAgentTask(row) : null;
}

export async function updateAgentTask(
  id: string,
  updates: Partial<Pick<AgentTask, "status" | "branch" | "prUrl" | "result">> & {
    progressMessage?: string;
  }
): Promise<AgentTask | null> {
  const existing = await prisma.agentTask.findUnique({ where: { id } });
  if (!existing) return null;

  const progress: string[] = JSON.parse(existing.progress);
  if (updates.progressMessage) progress.push(updates.progressMessage);

  const row = await prisma.agentTask.update({
    where: { id },
    data: {
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.branch !== undefined && { branch: updates.branch }),
      ...(updates.prUrl !== undefined && { prUrl: updates.prUrl }),
      progress: JSON.stringify(progress),
      ...(updates.result !== undefined && { result: JSON.stringify(updates.result) }),
    },
  });
  return dbToAgentTask(row);
}

export async function listAgentTasks(
  filter?: { type?: AgentTaskType; status?: AgentTaskStatus },
  pagination?: PaginationOpts
): Promise<PaginatedResult<AgentTask>> {
  const where = {
    ...(filter?.type && { type: filter.type }),
    ...(filter?.status && { status: filter.status }),
  };
  const { take, skip } = paginate(pagination);

  const [rows, total] = await Promise.all([
    prisma.agentTask.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
    }),
    prisma.agentTask.count({ where }),
  ]);

  return { items: rows.map(dbToAgentTask), total };
}

// ─── Review Reports ────────────────────────────────────────────────

function dbToReviewReport(row: {
  id: string;
  repo: string;
  reviewTypes: string;
  overallScore: number;
  categoryScores: string;
  findings: string;
  status: string;
  createdAt: Date;
}): ReviewReport & { status?: string } {
  return {
    id: row.id,
    repo: row.repo,
    reviewTypes: JSON.parse(row.reviewTypes),
    overallScore: row.overallScore,
    categoryScores: JSON.parse(row.categoryScores),
    findings: JSON.parse(row.findings),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveReviewReport(
  report: ReviewReport & { status?: string },
  userId?: string
): Promise<void> {
  await prisma.reviewReport.upsert({
    where: { id: report.id },
    update: {
      repo: report.repo,
      reviewTypes: JSON.stringify(report.reviewTypes),
      overallScore: report.overallScore,
      categoryScores: JSON.stringify(report.categoryScores),
      findings: JSON.stringify(report.findings),
      status: report.status ?? "completed",
    },
    create: {
      id: report.id,
      repo: report.repo,
      reviewTypes: JSON.stringify(report.reviewTypes),
      overallScore: report.overallScore,
      categoryScores: JSON.stringify(report.categoryScores),
      findings: JSON.stringify(report.findings),
      status: report.status ?? "completed",
      userId: userId ?? null,
      createdAt: report.createdAt ? new Date(report.createdAt) : new Date(),
    },
  });
}

export async function getReviewReport(id: string): Promise<(ReviewReport & { status?: string }) | null> {
  const row = await prisma.reviewReport.findUnique({ where: { id } });
  return row ? dbToReviewReport(row) : null;
}

export async function listReviewReports(
  filter?: { repo?: string },
  pagination?: PaginationOpts
): Promise<PaginatedResult<ReviewReport & { status?: string }>> {
  const where = {
    ...(filter?.repo && { repo: filter.repo }),
  };
  const { take, skip } = paginate(pagination);

  const [rows, total] = await Promise.all([
    prisma.reviewReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.reviewReport.count({ where }),
  ]);

  return { items: rows.map(dbToReviewReport), total };
}

// ─── Audit Reports ─────────────────────────────────────────────────

function dbToAuditReport(row: {
  id: string;
  repo: string;
  complianceScore: number;
  checks: string;
  recommendations: string;
  status: string;
  createdAt: Date;
}): AuditReport & { status?: string } {
  return {
    id: row.id,
    repo: row.repo,
    complianceScore: row.complianceScore,
    checks: JSON.parse(row.checks),
    recommendations: JSON.parse(row.recommendations),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveAuditReport(
  report: AuditReport & { status?: string },
  userId?: string
): Promise<void> {
  await prisma.auditReport.upsert({
    where: { id: report.id },
    update: {
      repo: report.repo,
      complianceScore: report.complianceScore,
      checks: JSON.stringify(report.checks),
      recommendations: JSON.stringify(report.recommendations),
      status: report.status ?? "completed",
    },
    create: {
      id: report.id,
      repo: report.repo,
      complianceScore: report.complianceScore,
      checks: JSON.stringify(report.checks),
      recommendations: JSON.stringify(report.recommendations),
      status: report.status ?? "completed",
      userId: userId ?? null,
      createdAt: report.createdAt ? new Date(report.createdAt) : new Date(),
    },
  });
}

export async function getAuditReport(id: string): Promise<(AuditReport & { status?: string }) | null> {
  const row = await prisma.auditReport.findUnique({ where: { id } });
  return row ? dbToAuditReport(row) : null;
}

export async function listAuditReports(
  filter?: { repo?: string },
  pagination?: PaginationOpts
): Promise<PaginatedResult<AuditReport & { status?: string }>> {
  const where = {
    ...(filter?.repo && { repo: filter.repo }),
  };
  const { take, skip } = paginate(pagination);

  const [rows, total] = await Promise.all([
    prisma.auditReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.auditReport.count({ where }),
  ]);

  return { items: rows.map(dbToAuditReport), total };
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

function dbToWorkHistory(row: {
  id: string;
  userId: string | null;
  actionType: string;
  entityId: string | null;
  repo: string | null;
  summary: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  metadata: string;
}): WorkHistoryEntry {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    actionType: row.actionType as ActionType,
    entityId: row.entityId ?? undefined,
    repo: row.repo ?? undefined,
    summary: row.summary,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? undefined,
    metadata: JSON.parse(row.metadata),
  };
}

export async function logWorkStart(
  userId: string | undefined,
  actionType: ActionType,
  repo: string | undefined,
  summary: string,
  entityId?: string
): Promise<string> {
  const row = await prisma.workHistory.create({
    data: {
      userId: userId ?? null,
      actionType,
      entityId: entityId ?? null,
      repo: repo ?? null,
      summary,
      status: "started",
    },
  });
  return row.id;
}

export async function logWorkComplete(workId: string, metadata?: Record<string, unknown>): Promise<void> {
  await prisma.workHistory.update({
    where: { id: workId },
    data: {
      status: "completed",
      completedAt: new Date(),
      ...(metadata && { metadata: JSON.stringify(metadata) }),
    },
  });
}

export async function logWorkFailure(workId: string, error: string): Promise<void> {
  const existing = await prisma.workHistory.findUnique({ where: { id: workId } });
  const existingMeta = existing ? JSON.parse(existing.metadata) : {};

  await prisma.workHistory.update({
    where: { id: workId },
    data: {
      status: "failed",
      completedAt: new Date(),
      metadata: JSON.stringify({ ...existingMeta, error }),
    },
  });
}

export async function listWorkHistory(
  filter?: { userId?: string; actionType?: ActionType; repo?: string },
  pagination?: PaginationOpts
): Promise<PaginatedResult<WorkHistoryEntry>> {
  const where = {
    ...(filter?.userId && { userId: filter.userId }),
    ...(filter?.actionType && { actionType: filter.actionType }),
    ...(filter?.repo && { repo: filter.repo }),
  };
  const { take, skip } = paginate(pagination);

  const [rows, total] = await Promise.all([
    prisma.workHistory.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take,
      skip,
    }),
    prisma.workHistory.count({ where }),
  ]);

  return { items: rows.map(dbToWorkHistory), total };
}

export async function getWorkHistoryEntry(id: string): Promise<WorkHistoryEntry | null> {
  const row = await prisma.workHistory.findUnique({ where: { id } });
  return row ? dbToWorkHistory(row) : null;
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

function dbToScaffoldPlan(row: {
  id: string;
  repo: string | null;
  mode: string;
  description: string | null;
  plan: string;
  status: string;
  knowledgeSources: string;
  userId: string | null;
  createdAt: Date;
}): ScaffoldPlanRecord {
  return {
    id: row.id,
    repo: row.repo ?? undefined,
    mode: row.mode,
    description: row.description ?? undefined,
    plan: JSON.parse(row.plan),
    status: row.status,
    knowledgeSources: JSON.parse(row.knowledgeSources),
    userId: row.userId ?? undefined,
    createdAt: row.createdAt.toISOString(),
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
  await prisma.scaffoldPlan.upsert({
    where: { id },
    update: {
      mode,
      description: description ?? null,
      plan: JSON.stringify(plan),
      knowledgeSources: JSON.stringify(knowledgeSources),
      status,
    },
    create: {
      id,
      mode,
      description: description ?? null,
      plan: JSON.stringify(plan),
      knowledgeSources: JSON.stringify(knowledgeSources),
      status,
      userId: userId ?? null,
    },
  });
}

export async function getScaffoldPlan(id: string): Promise<ScaffoldPlanRecord | null> {
  const row = await prisma.scaffoldPlan.findUnique({ where: { id } });
  return row ? dbToScaffoldPlan(row) : null;
}

export async function updateScaffoldPlanStatus(
  id: string,
  status: string,
  plan?: ScaffoldPlan,
  knowledgeSources?: string[]
): Promise<void> {
  await prisma.scaffoldPlan.update({
    where: { id },
    data: {
      status,
      ...(plan && { plan: JSON.stringify(plan) }),
      ...(knowledgeSources && { knowledgeSources: JSON.stringify(knowledgeSources) }),
    },
  });
}

export async function listScaffoldPlans(
  pagination?: PaginationOpts
): Promise<PaginatedResult<ScaffoldPlanRecord>> {
  const { take, skip } = paginate(pagination);

  const [rows, total] = await Promise.all([
    prisma.scaffoldPlan.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.scaffoldPlan.count(),
  ]);

  return { items: rows.map(dbToScaffoldPlan), total };
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
  const [totalTasks, runningTasks, completedTasks, totalReviews, totalAudits, totalScaffolds] =
    await Promise.all([
      prisma.agentTask.count(),
      prisma.agentTask.count({ where: { status: "running" } }),
      prisma.agentTask.count({ where: { status: "completed" } }),
      prisma.reviewReport.count(),
      prisma.auditReport.count(),
      prisma.scaffoldPlan.count(),
    ]);

  return {
    activeAgents: runningTasks,
    completedTasks,
    totalTasks,
    totalReviews,
    totalAudits,
    totalScaffolds,
  };
}

// ─── Onboarding Detection ──────────────────────────────────────────

export async function getOnboardingStatus(): Promise<{
  hasReview: boolean;
  hasAudit: boolean;
  hasScaffold: boolean;
  hasAgent: boolean;
}> {
  const [reviewCount, auditCount, scaffoldCount, agentCount] = await Promise.all([
    prisma.reviewReport.count(),
    prisma.auditReport.count(),
    prisma.scaffoldPlan.count(),
    prisma.agentTask.count(),
  ]);

  return {
    hasReview: reviewCount > 0,
    hasAudit: auditCount > 0,
    hasScaffold: scaffoldCount > 0,
    hasAgent: agentCount > 0,
  };
}
