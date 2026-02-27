import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOctokit } from "@/lib/github/octokit";
import { logWorkStart, logWorkComplete, logWorkFailure } from "@/lib/db/dal";
import type { ReviewFinding } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repo, finding } = (await request.json()) as {
    repo: string;
    finding: ReviewFinding;
  };

  if (!repo || !finding) {
    return NextResponse.json({ error: "repo and finding are required" }, { status: 400 });
  }

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return NextResponse.json({ error: "Invalid repo format" }, { status: 400 });
  }

  const workId = await logWorkStart(
    session.user?.email ?? undefined,
    "code-review",
    repo,
    `Create issue: ${finding.title}`
  );

  try {
    const octokit = getOctokit(session.accessToken);

    const body = [
      `## ${finding.title}`,
      "",
      `**Severity:** ${finding.severity}`,
      `**Category:** ${finding.category}`,
      "",
      finding.description,
      "",
      finding.file ? `**File:** \`${finding.file}\`${finding.line ? `:${finding.line}` : ""}` : "",
      "",
      finding.codeSnippet ? `### Current Code\n\`\`\`\n${finding.codeSnippet}\n\`\`\`` : "",
      "",
      finding.suggestion ? `### Suggestion\n${finding.suggestion}` : "",
      "",
      finding.suggestedCode ? `### Suggested Fix\n\`\`\`\n${finding.suggestedCode}\n\`\`\`` : "",
      "",
      "---",
      "*Created by Repo-Ninja code review*",
    ]
      .filter(Boolean)
      .join("\n");

    const labels: string[] = [finding.category, finding.severity];

    const { data } = await octokit.rest.issues.create({
      owner,
      repo: repoName,
      title: `[${finding.severity.toUpperCase()}] ${finding.title}`,
      body,
      labels,
    });

    await logWorkComplete(workId, { issueNumber: data.number, issueUrl: data.html_url });

    return NextResponse.json({
      issueNumber: data.number,
      issueUrl: data.html_url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logWorkFailure(workId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
