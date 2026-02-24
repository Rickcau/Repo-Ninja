import type { KnowledgeResult, ReviewType } from "@/lib/types";

export function buildScaffoldPrompt(
  userDescription: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert at scaffolding new GitHub repositories following best practices.

Based on the following best practices and standards:

${context}

The user wants to create a new repository:
"${userDescription}"

Generate a scaffold plan as JSON with this structure:
{
  "repoName": "suggested-repo-name",
  "description": "Short description",
  "structure": [
    { "path": "src/app/page.tsx", "description": "Main page component" }
  ],
  "bestPracticesApplied": ["TypeScript strict mode", "ESLint config"],
  "knowledgeSources": ["react-nextjs.md", "security.md"]
}

Be specific about file paths and what each file contains. Follow the patterns from the knowledge base documents.`;
}

export function buildReviewPrompt(
  code: string,
  reviewTypes: ReviewType[],
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert code reviewer. Review the following code against these standards:

${context}

Review types requested: ${reviewTypes.join(", ")}

Code to review:
\`\`\`
${code}
\`\`\`

Respond as JSON:
{
  "overallScore": 7.8,
  "categoryScores": [
    { "category": "security", "score": 8, "maxScore": 10, "issueCount": 2 }
  ],
  "findings": [
    {
      "severity": "high",
      "category": "security",
      "title": "SQL injection risk",
      "description": "User input is passed directly to query",
      "file": "src/lib/db.ts",
      "line": 45,
      "suggestion": "Use parameterized queries"
    }
  ]
}`;
}

export function buildIssueSolverPrompt(
  issueTitle: string,
  issueBody: string,
  repoContext: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, an expert developer. Solve the following GitHub issue following these standards:

${context}

Issue: ${issueTitle}
${issueBody}

Repository context:
${repoContext}

Generate the code changes needed to solve this issue. For each file, provide the complete updated content.
Respond as JSON:
{
  "summary": "Brief description of changes",
  "files": [
    { "path": "src/lib/auth.ts", "action": "modify", "content": "full file content..." }
  ],
  "commitMessage": "fix: resolve login redirect issue (#15)"
}`;
}

export function buildAuditPrompt(
  repoStructure: string,
  knowledgeDocs: KnowledgeResult[]
): string {
  const context = knowledgeDocs
    .map((doc) => `--- ${doc.metadata.filename} ---\n${doc.content}`)
    .join("\n\n");

  return `You are Repo-Ninja, a best practices auditor. Check the following repository against these standards:

${context}

Repository structure and key files:
${repoStructure}

Respond as JSON:
{
  "complianceScore": 72,
  "checks": [
    { "name": "TypeScript strict mode", "status": "pass", "description": "tsconfig.json has strict: true" },
    { "name": "CI/CD pipeline", "status": "fail", "description": "No GitHub Actions workflow found" }
  ],
  "recommendations": [
    "Add a GitHub Actions workflow for CI/CD",
    "Add unit tests for core functionality"
  ]
}`;
}
