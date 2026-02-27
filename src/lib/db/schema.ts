import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ||
  path.join(process.cwd(), "repo-ninja.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      repo TEXT NOT NULL,
      description TEXT NOT NULL,
      branch TEXT,
      pr_url TEXT,
      progress TEXT NOT NULL DEFAULT '[]',
      result TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_reports (
      id TEXT PRIMARY KEY,
      repo TEXT NOT NULL,
      review_types TEXT NOT NULL DEFAULT '[]',
      overall_score REAL NOT NULL DEFAULT 0,
      category_scores TEXT NOT NULL DEFAULT '[]',
      findings TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'completed',
      user_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_reports (
      id TEXT PRIMARY KEY,
      repo TEXT NOT NULL,
      compliance_score REAL NOT NULL DEFAULT 0,
      checks TEXT NOT NULL DEFAULT '[]',
      recommendations TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'completed',
      user_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action_type TEXT NOT NULL,
      entity_id TEXT,
      repo TEXT,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'started',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS scaffold_plans (
      id TEXT PRIMARY KEY,
      repo TEXT,
      mode TEXT NOT NULL,
      description TEXT,
      plan TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'generating',
      knowledge_sources TEXT NOT NULL DEFAULT '[]',
      user_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(type);
    CREATE INDEX IF NOT EXISTS idx_work_history_user ON work_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_work_history_action ON work_history(action_type);
    CREATE INDEX IF NOT EXISTS idx_review_reports_repo ON review_reports(repo);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_repo ON audit_reports(repo);
  `);
}
