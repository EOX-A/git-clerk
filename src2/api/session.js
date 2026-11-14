const SESSION_FIELDS = `
  id title number url state isDraft updatedAt
  author { login }
  headRepositoryOwner { login }
`;

export async function affiliatedForkOwners(octokit, githubConfig) {
  const owners = [];
  let after = null;
  do {
    const response = await octokit.graphql(
      `query($owner: String!, $repo: String!, $after: String) {
        repository(owner: $owner, name: $repo) {
          forks(first: 100, after: $after, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
            pageInfo { hasNextPage endCursor }
            nodes { name viewerPermission owner { login __typename } }
          }
        }
      }`,
      { owner: githubConfig.username, repo: githubConfig.repo, after },
    );
    const { nodes, pageInfo } = response.repository.forks;
    for (const fork of nodes) {
      if (
        fork.name === githubConfig.repo &&
        fork.owner.__typename === "Organization" &&
        ["ADMIN", "MAINTAIN", "WRITE"].includes(fork.viewerPermission)
      )
        owners.push(fork.owner.login);
    }
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);
  return owners;
}

function matchesScope(node, { scopeOwners, githubUserData }) {
  if (scopeOwners === null) return true;
  // V1 falls back to the authenticated author's PRs when no fork scope exists.
  if (!scopeOwners.length) {
    return (
      node.author?.login?.toLowerCase() === githubUserData.login.toLowerCase()
    );
  }
  return scopeOwners.includes(node.headRepositoryOwner?.login?.toLowerCase());
}

function mapSession(node, githubConfig) {
  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    status:
      node.state === "OPEN"
        ? node.isDraft
          ? "draft"
          : "open"
        : node.state.toLowerCase(),
    updatedAt: node.updatedAt,
    repo: githubConfig.repo,
    owner: githubConfig.username,
  };
}

export async function sessionsList(context, after = null, signal) {
  const { octokit, githubConfig } = context;
  let pageInfo;
  let nodes;
  do {
    signal?.throwIfAborted();
    const response = await octokit.graphql(
      `query($owner: String!, $repo: String!, $after: String) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 100, after: $after, states: [OPEN, CLOSED, MERGED], orderBy: { field: UPDATED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            nodes { ${SESSION_FIELDS} }
          }
        }
      }`,
      {
        owner: githubConfig.username,
        repo: githubConfig.repo,
        after,
        request: { signal },
      },
    );
    signal?.throwIfAborted();
    ({ pageInfo, nodes } = response.repository.pullRequests);
    nodes = nodes.filter((node) => matchesScope(node, context));
    after = pageInfo.endCursor;
    // A GitHub page can contain only other people's forks; keep looking.
  } while (!nodes.length && pageInfo.hasNextPage);
  return {
    data: nodes.map((node) => mapSession(node, githubConfig)),
    pageInfo,
  };
}

export async function sessionDetails(context, number, signal) {
  const { octokit, githubConfig } = context;
  const response = await octokit.graphql(
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          ${SESSION_FIELDS}
          headRefName headRefOid changedFiles viewerCanUpdate reviewDecision
          headRef { id }
          headRepository {
            name owner { login } viewerPermission defaultBranchRef { name }
          }
          statusCheckRollup { state }
        }
      }
    }`,
    {
      owner: githubConfig.username,
      repo: githubConfig.repo,
      number,
      request: { signal },
    },
  );
  signal?.throwIfAborted();
  const node = response.repository?.pullRequest;
  if (!node || !matchesScope(node, context)) {
    const error = new Error("Session not found in the current scope.");
    error.status = 404;
    throw error;
  }
  const session = mapSession(node, githubConfig);
  const canManage =
    Boolean(node.viewerCanUpdate) && ["draft", "open"].includes(session.status);
  const head = node.headRepository;
  return {
    ...session,
    branch: node.headRefName,
    headSha: node.headRefOid,
    headRefID: node.headRef?.id || null,
    headOwner: head?.owner.login,
    headRepo: head?.name,
    changedFiles: node.changedFiles ?? 0,
    checks: node.statusCheckRollup?.state || null,
    reviewDecision: node.reviewDecision,
    canManage,
    // Never offer branch deletion for a default branch or an unwritable fork.
    canDelete:
      canManage &&
      (!node.headRef ||
        Boolean(
          head?.defaultBranchRef?.name &&
          node.headRefName !== head.defaultBranchRef.name &&
          ["ADMIN", "MAINTAIN", "WRITE"].includes(head.viewerPermission),
        )),
  };
}
