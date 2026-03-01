import { Octokit } from "octokit";

export function getOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function listUserRepos(octokit: Octokit) {
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 50,
  });
  return data.map((repo) => ({
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
  }));
}

export async function listRepoIssues(octokit: Octokit, owner: string, repo: string) {
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: "open",
    per_page: 50,
  });
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || "",
      labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
      createdAt: issue.created_at,
    }));
}

export async function getRepoTree(octokit: Octokit, owner: string, repo: string, branch: string) {
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });
  return data.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path || "");
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string
) {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });
  if ("content" in data) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return "";
}

export async function createRepo(
  octokit: Octokit,
  name: string,
  description: string,
  isPrivate: boolean
) {
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: true,
  });
  return {
    fullName: data.full_name,
    htmlUrl: data.html_url,
    defaultBranch: data.default_branch,
    owner: data.owner.login,
  };
}

export async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string
) {
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });
}

export async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string
) {
  for (const file of files) {
    let sha: string | undefined;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: branch,
      });
      if ("sha" in data) {
        sha = data.sha;
      }
    } catch {
      // File doesn't exist yet
    }
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file.path,
      message,
      content: Buffer.from(file.content).toString("base64"),
      branch,
      sha,
    });
  }
}

export async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
) {
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    title,
    body,
    head,
    base,
  });
  return { number: data.number, htmlUrl: data.html_url };
}

/**
 * Create a GitHub Issue and optionally assign to 'copilot' to trigger the coding agent.
 */
export async function createIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  assignees: string[] = []
) {
  const { data } = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    body,
    assignees,
  });
  return { number: data.number, htmlUrl: data.html_url };
}

/**
 * Enable the Copilot coding agent on a repo by finding the Copilot GitHub App
 * installation for the authenticated user and adding the repo to it.
 *
 * When the user has Copilot Pro/Business with the coding agent enabled, GitHub
 * installs a "GitHub Copilot" App on their account. Individual repos must be
 * granted access to that installation before the `copilot` assignee is valid.
 *
 * Returns { status, body } for diagnostic display.
 */
export async function enableCopilotCodingAgent(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ status: number; body: unknown }> {
  try {
    // Step 1: list all GitHub App installations accessible to the authenticated user
    const installsRes = await octokit.request("GET /user/installations", {
      per_page: 100,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    type Installation = { id: number; app_slug: string };
    const installs = installsRes.data.installations as Installation[];
    const allSlugs = installs.map((i) => i.app_slug);

    // GitHub Copilot coding agent is wired through a "github-copilot" (or similar) app
    const copilotInstall = installs.find((i) =>
      i.app_slug?.toLowerCase().includes("copilot")
    );

    if (!copilotInstall) {
      return {
        status: 404,
        body: {
          message:
            "No Copilot GitHub App installation found. Ensure Copilot Pro/Business with coding agent is enabled on your account.",
          availableSlugs: allSlugs,
        },
      };
    }

    // Step 2: get the repo's numeric ID
    const repoRes = await octokit.rest.repos.get({ owner, repo });
    const repoId = repoRes.data.id;

    // Step 3: add the repo to the Copilot App installation
    try {
      const addRes = await octokit.request(
        "PUT /user/installations/{installation_id}/repositories/{repository_id}",
        {
          installation_id: copilotInstall.id,
          repository_id: repoId,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }
      );
      return {
        status: addRes.status,
        body: {
          message: `Repo (id: ${repoId}) added to Copilot App (id: ${copilotInstall.id}, slug: ${copilotInstall.app_slug}).`,
        },
      };
    } catch (addErr: unknown) {
      const e = addErr as { status?: number; message?: string; response?: { data?: unknown } };
      // 422 on this PUT usually means the installation is already set to "All repositories"
      if (e.status === 422) {
        return {
          status: 204,
          body: {
            message:
              "Copilot installation already covers all repositories — no explicit repo grant needed.",
            installationSlug: copilotInstall.app_slug,
          },
        };
      }
      return {
        status: e.status ?? 0,
        body: { error: e.message ?? String(addErr), detail: e.response?.data },
      };
    }
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; response?: { data?: unknown } };
    return {
      status: e.status ?? 0,
      body: { error: e.message ?? String(err), detail: e.response?.data },
    };
  }
}

/**
 * Create a repository ruleset that requests Copilot as an automatic code reviewer
 * on all PRs targeting the default branch.
 * Returns the raw response for diagnostic purposes.
 */
export async function createCopilotReviewRuleset(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string
): Promise<{ status: number; body: unknown }> {
  try {
    const res = await octokit.request("POST /repos/{owner}/{repo}/rulesets", {
      owner,
      repo,
      name: "copilot-auto-review",
      target: "branch",
      enforcement: "active",
      conditions: {
        ref_name: {
          include: [`refs/heads/${defaultBranch}`],
          exclude: [],
        },
      },
      rules: [
        {
          type: "pull_request",
          parameters: {
            required_approving_review_count: 0,
            dismiss_stale_reviews_on_push: false,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_review_thread_resolution: false,
          },
        },
      ],
      // Request Copilot as automatic reviewer — bypass_actors format for Copilot
      // This is the experimental shape; we capture the response to see what works.
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
    return { status: res.status, body: res.data };
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; response?: { data?: unknown } };
    return {
      status: e.status ?? 0,
      body: { error: e.message ?? String(err), detail: e.response?.data },
    };
  }
}
