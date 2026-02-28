-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "repo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "branch" TEXT,
    "pr_url" TEXT,
    "progress" TEXT NOT NULL DEFAULT '[]',
    "result" TEXT,
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repo" TEXT NOT NULL,
    "review_types" TEXT NOT NULL DEFAULT '[]',
    "overall_score" REAL NOT NULL DEFAULT 0,
    "category_scores" TEXT NOT NULL DEFAULT '[]',
    "findings" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "audit_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repo" TEXT NOT NULL,
    "compliance_score" REAL NOT NULL DEFAULT 0,
    "checks" TEXT NOT NULL DEFAULT '[]',
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "work_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "repo" TEXT,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "metadata" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "scaffold_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repo" TEXT,
    "mode" TEXT NOT NULL,
    "description" TEXT,
    "plan" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'generating',
    "knowledge_sources" TEXT NOT NULL DEFAULT '[]',
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks"("status");

-- CreateIndex
CREATE INDEX "agent_tasks_type_idx" ON "agent_tasks"("type");

-- CreateIndex
CREATE INDEX "agent_tasks_user_id_idx" ON "agent_tasks"("user_id");

-- CreateIndex
CREATE INDEX "review_reports_repo_idx" ON "review_reports"("repo");

-- CreateIndex
CREATE INDEX "review_reports_user_id_idx" ON "review_reports"("user_id");

-- CreateIndex
CREATE INDEX "audit_reports_repo_idx" ON "audit_reports"("repo");

-- CreateIndex
CREATE INDEX "audit_reports_user_id_idx" ON "audit_reports"("user_id");

-- CreateIndex
CREATE INDEX "work_history_user_id_idx" ON "work_history"("user_id");

-- CreateIndex
CREATE INDEX "work_history_action_type_idx" ON "work_history"("action_type");

-- CreateIndex
CREATE INDEX "work_history_repo_idx" ON "work_history"("repo");

-- CreateIndex
CREATE INDEX "scaffold_plans_user_id_idx" ON "scaffold_plans"("user_id");
