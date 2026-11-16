import { Base64 } from "js-base64";
import { sessionDetails } from "./session.js";

export async function fileContent(context, session, path, signal) {
  signal?.throwIfAborted();
  const target = {
    owner: context.githubConfig.username,
    repo: context.githubConfig.repo,
  };
  let source = {
    owner: session.headOwner || target.owner,
    repo: session.headRepo || target.repo,
  };
  const params = {
    path: path.replace(/^\//, ""),
    ref: session.headSha,
    request: { signal },
  };
  let response;
  try {
    response = await context.octokit.rest.repos.getContent({
      ...source,
      ...params,
    });
  } catch (error) {
    if (
      error.status !== 404 ||
      (source.owner === target.owner && source.repo === target.repo)
    )
      throw error;
    signal?.throwIfAborted();
    source = target;
    response = await context.octokit.rest.repos.getContent({
      ...source,
      ...params,
    });
  }
  signal?.throwIfAborted();
  const data = response.data;
  if (Array.isArray(data) || data.type !== "file")
    throw new Error("This path is not a regular file.");
  let text = null;
  let unavailable = "";
  if (data.encoding !== "base64" || data.size > 1024 * 1024)
    unavailable = "This file is too large to edit here. Open it on GitHub.";
  else {
    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        Base64.toUint8Array(data.content),
      );
      if (text.includes("\0")) throw new Error("Binary file");
    } catch {
      text = null;
      unavailable =
        "This file is binary or is not UTF-8 text. Open it on GitHub.";
    }
  }
  return { ...data, text, unavailable, owner: source.owner, repo: source.repo };
}

export async function saveFileContent(context, session, path, text, sha) {
  // Recheck scope and write permissions immediately before committing to the actual head.
  const fresh = await sessionDetails(context, session.number);
  if (
    !fresh.canEdit ||
    fresh.headOwner !== session.headOwner ||
    fresh.headRepo !== session.headRepo ||
    fresh.branch !== session.branch
  ) {
    throw Object.assign(new Error("This session is no longer writable."), {
      status: 403,
    });
  }
  if (!sha || typeof text !== "string")
    throw new Error("An existing file SHA and text are required.");
  const { data } = await context.octokit.rest.repos.createOrUpdateFileContents({
    owner: fresh.headOwner,
    repo: fresh.headRepo,
    branch: fresh.branch,
    path,
    sha,
    content: Base64.encode(text),
    message: `chores: file updated - ${path}`,
  });
  return { sha: data.content.sha, commitSha: data.commit.sha };
}

export async function fileDiff(context, session, path, signal) {
  let page = 1;
  while (true) {
    signal?.throwIfAborted();
    const { data, headers } = await context.octokit.rest.pulls.listFiles({
      owner: context.githubConfig.username,
      repo: context.githubConfig.repo,
      pull_number: session.number,
      per_page: 100,
      page,
      request: { signal },
    });
    signal?.throwIfAborted();
    const file = data.find((file) => file.filename === path);
    if (file)
      return {
        patch: file.patch ?? null,
        additions: file.additions,
        deletions: file.deletions,
        status: file.status,
      };
    if (!/rel="next"/.test(headers?.link || ""))
      return { patch: "", additions: 0, deletions: 0 };
    page++;
  }
}
