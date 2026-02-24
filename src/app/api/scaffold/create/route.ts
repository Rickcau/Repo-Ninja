import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOctokit, createRepo, commitFiles } from "@/lib/github/octokit";
import { askCopilot } from "@/lib/copilot-sdk/client";
import type { ScaffoldPlan } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, repoName, isPrivate } = (await request.json()) as {
    plan: ScaffoldPlan;
    repoName: string;
    isPrivate: boolean;
  };

  const accessToken = session.accessToken;
  if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 });

  const octokit = getOctokit(accessToken);

  // Create the repo
  const repo = await createRepo(octokit, repoName, plan.description, isPrivate);

  // Generate file contents via Copilot SDK
  const filePrompt = `Generate the complete file contents for each file in this scaffold plan:
${JSON.stringify(plan.structure, null, 2)}

For each file, return JSON array:
[{ "path": "file/path.ts", "content": "full file content..." }]

Make the code production-ready following the best practices: ${plan.bestPracticesApplied.join(", ")}`;

  const response = await askCopilot(filePrompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  const files = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  // Commit files to repo
  if (files.length > 0) {
    await commitFiles(
      octokit,
      repo.owner,
      repoName,
      repo.defaultBranch,
      files,
      "feat: initial scaffold by Repo-Ninja"
    );
  }

  return NextResponse.json({
    success: true,
    repoUrl: repo.htmlUrl,
    filesCreated: files.length,
  });
}
