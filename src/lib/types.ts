// === Knowledge Base Types ===

export interface KnowledgeDocument {
  id: string;
  filename: string;
  category: KnowledgeCategory;
  content: string;
  metadata: DocMetadata;
}

export type KnowledgeCategory =
  | "best-practices"
  | "scaffolding"
  | "review-instructions"
  | "agent-instructions"
  | "architecture-patterns"
  | "ci-cd"
  | "responsible-ai";

export interface DocMetadata {
  category: KnowledgeCategory;
  filename: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

export interface KnowledgeResult {
  id: string;
  content: string;
  metadata: DocMetadata;
  score: number;
}

// === KnowledgeStore Interface (Azure upgrade path) ===

export interface KnowledgeStore {
  search(query: string, topK: number): Promise<KnowledgeResult[]>;
  upsert(docId: string, content: string, metadata: DocMetadata): Promise<void>;
  delete(docId: string): Promise<void>;
  reindexAll(): Promise<void>;
  getStatus(): Promise<{ connected: boolean; documentCount: number }>;
}

// === Agent Types ===

export type AgentTaskType = "issue-solver" | "code-writer" | "code-review" | "best-practices-audit";

export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  repo: string;
  description: string;
  branch?: string;
  prUrl?: string;
  progress: string[];
  createdAt: string;
  updatedAt: string;
  result?: AgentTaskResult;
}

export interface AgentTaskResult {
  summary: string;
  prUrl?: string;
  reportUrl?: string;
  reportPath?: string;
}

// === Scaffold Types ===

export interface ScaffoldRequest {
  mode: "natural-language" | "guided";
  description?: string;
  options?: GuidedScaffoldOptions;
}

export interface GuidedScaffoldOptions {
  framework: string;
  language: string;
  auth: string;
  database: string;
  styling: string;
  cicd: string;
}

export interface ScaffoldPlan {
  repoName: string;
  description: string;
  structure: ScaffoldFile[];
  bestPracticesApplied: string[];
  knowledgeSources: string[];
}

export interface ScaffoldFile {
  path: string;
  description: string;
  content?: string;
}

// === Review Types ===

export type ReviewType = "security" | "performance" | "accessibility" | "general" | "custom";

export type ReviewScope = "full-repo" | "pr" | "files";

export interface ReviewRequest {
  repo: string;
  reviewTypes: ReviewType[];
  scope: ReviewScope;
  prNumber?: number;
  filePattern?: string;
}

export interface ReviewReport {
  id: string;
  repo: string;
  reviewTypes: ReviewType[];
  overallScore: number;
  categoryScores: CategoryScore[];
  findings: ReviewFinding[];
  createdAt: string;
}

export interface CategoryScore {
  category: ReviewType;
  score: number;
  maxScore: number;
  issueCount: number;
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export interface ReviewFinding {
  severity: FindingSeverity;
  category: ReviewType;
  title: string;
  description: string;
  file?: string;
  line?: number;
  codeSnippet?: string;
  knowledgeSource?: string;
  suggestion?: string;
  suggestedCode?: string;
}

// === Best Practices Audit Types ===

export interface AuditReport {
  id: string;
  repo: string;
  complianceScore: number;
  checks: AuditCheck[];
  recommendations: string[];
  createdAt: string;
}

export interface AuditCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  description: string;
}
