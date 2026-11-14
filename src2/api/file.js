// Read metadata only: no blob, patch rendering, or file content requests.
export async function sessionFiles(context, session, signal) {
  const { octokit, githubConfig } = context;
  const files = [];
  let page = 1;
  let hasNext;
  do {
    signal?.throwIfAborted();
    const response = await octokit.rest.pulls.listFiles({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: session.number,
      per_page: 100,
      page,
      request: { signal },
    });
    signal?.throwIfAborted();
    files.push(
      ...response.data.map((file) => ({
        path: file.filename,
        previousPath: file.previous_filename || null,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
      })),
    );
    hasNext = /rel="next"/.test(response.headers?.link || "");
    page++;
  } while (hasNext);
  return { files, incomplete: files.length < session.changedFiles };
}

export async function branchRoot(context, session, signal) {
  signal?.throwIfAborted();
  const { octokit, githubConfig } = context;
  let source = {
    owner: session.headOwner || githubConfig.username,
    repo: session.headRepo || githubConfig.repo,
  };
  let response;
  try {
    response = await octokit.rest.git.getCommit({
      ...source,
      commit_sha: session.headSha,
      request: { signal },
    });
  } catch (error) {
    if (
      error.status !== 404 ||
      (source.owner === githubConfig.username &&
        source.repo === githubConfig.repo)
    )
      throw error;
    // The PR's head commit can remain in the target after a fork is deleted.
    source = { owner: githubConfig.username, repo: githubConfig.repo };
    response = await octokit.rest.git.getCommit({
      ...source,
      commit_sha: session.headSha,
      request: { signal },
    });
  }
  signal?.throwIfAborted();
  return { ...source, treeSha: response.data.tree.sha };
}

export async function branchDirectory(
  context,
  source,
  treeSha,
  path = "",
  signal,
) {
  signal?.throwIfAborted();
  const { data } = await context.octokit.rest.git.getTree({
    owner: source.owner,
    repo: source.repo,
    tree_sha: treeSha,
    request: { signal },
  });
  signal?.throwIfAborted();
  if (data.truncated) throw new Error("Directory listing is incomplete.");
  return data.tree
    .map((entry) => ({
      name: entry.path,
      path: path ? `${path}/${entry.path}` : entry.path,
      sha: entry.sha,
      type:
        entry.type === "tree"
          ? "folder"
          : entry.type === "commit"
            ? "submodule"
            : "file",
    }))
    .sort(
      (a, b) =>
        (a.type === "folder" ? 0 : 1) - (b.type === "folder" ? 0 : 1) ||
        a.name.localeCompare(b.name),
    );
}
