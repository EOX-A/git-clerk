import { brokerBranchPrefix } from "./git-broker.js";

const checkStates = {
  success: "SUCCESS",
  passing: "SUCCESS",
  passed: "SUCCESS",
  failure: "FAILURE",
  failed: "FAILURE",
  error: "ERROR",
  pending: "PENDING",
  running: "PENDING",
  expected: "EXPECTED",
};

export function ownsBranch(context, branch) {
  const prefix = brokerBranchPrefix(context.user);
  return Boolean(
    prefix && branch?.startsWith(prefix) && branch.length > prefix.length,
  );
}

export function mapSession(context, data) {
  const number = data.number ?? data.pr_number;
  const branch = data.head_branch;
  const open = data.state === "open" || data.state === "opened";
  const repoPath = data.repo || context.repository.repo;
  const repo = repoPath.split("/").at(-1);
  const owner = repoPath.slice(0, -(repo.length + 1));
  const sessionBranch =
    /^session\/[^/]+\/.+/.test(branch ?? "") &&
    branch !== context.repository.default_branch &&
    branch !== data.base_branch;
  const status =
    data.merged || data.state === "merged"
      ? "merged"
      : open
        ? data.draft
          ? "draft"
          : "open"
        : "closed";
  return {
    id: number,
    number,
    title: data.title,
    url: data.html_url || data.pr_url,
    updatedAt: data.updated_at,
    author: data.author,
    status,
    prState: data.provider_state ?? data.state,
    branch,
    baseBranch: data.base_branch,
    headSha: data.head_sha,
    baseSha: data.base_sha,
    owner,
    repo,
    headOwner: owner,
    headRepo: repo,
    provider: data.provider || context.repository.provider,
    repositoryUrl: context.repository.html_url,
    // Luigi can supply the user after the session has already loaded.
    get canManage() {
      return (
        status !== "merged" && sessionBranch && ownsBranch(context, branch)
      );
    },
    canEdit:
      open &&
      !data.merged &&
      sessionBranch &&
      context.repository.permissions?.push !== false,
    get canDelete() {
      return (
        open && !data.merged && sessionBranch && ownsBranch(context, branch)
      );
    },
    body: data.body,
    changedFiles: data.changed_files,
    checks: checkStates[data.ci_status?.toLowerCase()],
    reviewDecision: data.review_status?.toUpperCase(),
  };
}

export async function sessionsList(context, after = null, signal) {
  const page = after ?? 1;
  const perPage = 20;
  const result = await context.request("/pulls", {
    query: { state: "all", page, per_page: perPage },
    signal,
  });
  signal?.throwIfAborted();
  const data = result.pull_requests.map((pr) => mapSession(context, pr));
  const hasNextPage = data.length === perPage;
  return {
    data,
    pageInfo: { hasNextPage, endCursor: hasNextPage ? page + 1 : null },
  };
}

export async function sessionDetails(context, number, signal) {
  const data = await context.request(`/pulls/${number}`, { signal });
  signal?.throwIfAborted();
  const session = mapSession(context, data);
  session.hasDetails = true;
  return session;
}

export async function findSessionBranch(context, branch) {
  let cursor = null;
  do {
    const result = await sessionsList(context, cursor);
    const match = result.data.find((session) => session.branch === branch);
    if (match) return sessionDetails(context, match.number);
    cursor = result.pageInfo.endCursor;
  } while (cursor);
  return null;
}
