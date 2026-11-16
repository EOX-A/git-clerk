import slugify from "slugify";

const fail = (code, message) => Object.assign(new Error(message), { code });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep attempt state across retries so a lost response cannot create another PR.
export async function createPersonalSession(
  context,
  name,
  attempt = {},
  onProgress = () => {},
  wait = pause,
) {
  const title = name.trim();
  if (!title || title.length > 256)
    throw fail(
      "SESSION_NAME_INVALID",
      "Enter a session name between 1 and 256 characters.",
    );
  if (attempt.result) return attempt.result;
  if (attempt.title && attempt.title !== title)
    throw fail(
      "SESSION_CREATION_STARTED",
      "Retry with the same session name to finish creating this session.",
    );
  const { octokit, githubConfig, githubUserData } = context;
  const target = { owner: githubConfig.username, repo: githubConfig.repo };
  const login = githubUserData.login;
  if (attempt.login && attempt.login !== login)
    throw fail(
      "SESSION_ACCOUNT_CHANGED",
      "Sign in with the account that started this session to continue.",
    );
  attempt.login = login;

  onProgress("Checking your personal fork…");
  const { data: upstream } = await octokit.rest.repos.get(target);
  if (!upstream.default_branch || upstream.archived || upstream.disabled)
    throw fail(
      "SESSION_REPOSITORY_UNAVAILABLE",
      "This repository cannot accept a new session.",
    );
  let fork;
  const personal = { owner: login, repo: attempt.repo || target.repo };
  try {
    ({ data: fork } = await octokit.rest.repos.get(personal));
  } catch (error) {
    if (error.status !== 404) throw error;
    onProgress("Creating your personal fork…");
    const { data } = await octokit.rest.repos.createFork(target);
    // GitHub may return an existing fork with a different repository name.
    attempt.repo = data.name;
    personal.repo = data.name;
    for (let retry = 0; retry < 6; retry++) {
      onProgress("Waiting for your personal fork…");
      await wait(5000);
      try {
        ({ data: fork } = await octokit.rest.repos.get(personal));
        if (fork.default_branch) break;
      } catch (cause) {
        if (cause.status !== 404) throw cause;
      }
    }
    if (!fork?.default_branch)
      throw fail(
        "SESSION_FORK_PENDING",
        "GitHub is still preparing your fork. Wait a moment and retry.",
      );
  }
  const sameRepository = fork.id === upstream.id;
  const sameNetwork =
    fork.parent?.id === upstream.id ||
    (fork.source?.id &&
      fork.source.id === (upstream.source?.id || upstream.id));
  if (
    fork.owner?.login?.toLowerCase() !== login.toLowerCase() ||
    (!sameRepository && (!fork.fork || !sameNetwork))
  ) {
    throw fail(
      "SESSION_FORK_MISMATCH",
      "The repository in your account is not a fork of this repository. Rename that repository or create the correct personal fork, then retry.",
    );
  }
  if (
    (!fork.permissions?.push && !fork.permissions?.admin) ||
    fork.archived ||
    fork.disabled
  )
    throw fail(
      "SESSION_FORK_READ_ONLY",
      "GitHub has not granted write access to your personal fork. Check the app's repository access and retry.",
    );
  attempt.repo = fork.name;
  personal.repo = fork.name;
  attempt.base ||= upstream.default_branch;

  if (!attempt.commitSha) {
    onProgress("Updating your personal fork…");
    const { data: sourceRef } = await octokit.rest.git.getRef({
      ...target,
      ref: `heads/${attempt.base}`,
    });
    const { data: forkRef } = await octokit.rest.git.getRef({
      ...personal,
      ref: `heads/${fork.default_branch}`,
    });
    const sourceSha = sourceRef.object.sha;
    if (forkRef.object.sha !== sourceSha) {
      const { data: comparison } = await octokit.rest.repos.compareCommits({
        ...target,
        base: forkRef.object.sha,
        head: sourceSha,
      });
      if (comparison.status !== "ahead")
        throw fail(
          "SESSION_FORK_DIVERGED",
          "Your fork's default branch has its own commits. Sync it with the upstream repository before creating a session.",
        );
      // A concurrent fork change must fail, never be overwritten by a forced update.
      await octokit.rest.git.updateRef({
        ...personal,
        ref: `heads/${fork.default_branch}`,
        sha: sourceSha,
        force: false,
      });
    }
    const { data: commit } = await octokit.rest.git.getCommit({
      ...personal,
      commit_sha: sourceSha,
    });
    onProgress("Preparing the session branch…");
    const { data: initial } = await octokit.rest.git.createCommit({
      ...personal,
      message: "chore: create session using empty commit",
      tree: commit.tree.sha,
      parents: [sourceSha],
    });
    attempt.commitSha = initial.sha;
    attempt.title = title;
  }

  if (!attempt.branchReady) {
    const stem = `${login}/${slugify(title, { lower: true, strict: true }).slice(0, 120) || "session"}`;
    for (let suffix = attempt.suffix || 1; suffix <= 25; suffix++) {
      attempt.suffix = suffix;
      attempt.branch = suffix === 1 ? stem : `${stem}-${suffix}`;
      const params = { ...personal, ref: `heads/${attempt.branch}` };
      let existing;
      try {
        ({ data: existing } = await octokit.rest.git.getRef(params));
      } catch (error) {
        if (error.status !== 404) throw error;
      }
      if (existing) {
        if (existing.object.sha === attempt.commitSha) {
          attempt.branchReady = true;
          break;
        }
        continue;
      }
      try {
        await octokit.rest.git.createRef({
          ...personal,
          ref: `refs/heads/${attempt.branch}`,
          sha: attempt.commitSha,
        });
        attempt.branchReady = true;
        break;
      } catch (error) {
        // Reconcile a successful write whose response was lost, or a competing branch.
        try {
          const { data } = await octokit.rest.git.getRef(params);
          if (data.object.sha === attempt.commitSha) {
            attempt.branchReady = true;
            break;
          }
          if (error.status === 422) continue;
        } catch {
          /* Preserve the original request failure for a safe retry. */
        }
        throw error;
      }
    }
    if (!attempt.branchReady)
      throw fail(
        "SESSION_BRANCH_COLLISION",
        "Too many branches use this session name. Close this dialog and choose another name.",
      );
  }

  onProgress("Creating your draft session…");
  const head = `${login}:${attempt.branch}`;
  const { data: existingPRs } = await octokit.rest.pulls.list({
    ...target,
    head,
    base: attempt.base,
    state: "all",
    per_page: 100,
  });
  let pr = existingPRs.find(
    (item) =>
      item.head?.ref === attempt.branch &&
      item.head?.repo?.owner?.login?.toLowerCase() === login.toLowerCase(),
  );
  if (!pr)
    ({ data: pr } = await octokit.rest.pulls.create({
      ...target,
      title: attempt.title,
      head,
      base: attempt.base,
      draft: true,
    }));
  attempt.result = {
    id: pr.node_id,
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    status: pr.merged_at
      ? "merged"
      : pr.state === "closed"
        ? "closed"
        : pr.draft
          ? "draft"
          : "open",
    updatedAt: pr.updated_at,
    owner: target.owner,
    repo: target.repo,
    branch: attempt.branch,
    headRefID: attempt.branch,
    headOwner: login,
    headRepo: personal.repo,
    canManage: true,
    canEdit: true,
    canDelete: attempt.branch !== fork.default_branch,
  };
  return attempt.result;
}
