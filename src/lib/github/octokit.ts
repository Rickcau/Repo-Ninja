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
