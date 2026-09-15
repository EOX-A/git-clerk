import slugify from "slugify";

function mapPullRequestNode(node) {
  return {
    ...node,
    draft: node.isDraft,
    state: node.state.toLowerCase(),
    changed_files: node.changedFiles,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    html_url: node.url,
  };
}

const ORG_PULL_REQUESTS_QUERY = `
  query($owner: String!, $repo: String!, $states: [PullRequestState!], $perPage: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      pullRequests(states: $states, first: $perPage, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          url
          state
          number
          changedFiles
          createdAt
          updatedAt
          isDraft
          author {
            login
          }
          headRepositoryOwner {
            login
          }
        }
      }
    }
  }
`;

const orgPullRequestsCache = new Map();

export function clearOrgPullRequestsCache() {
  orgPullRequestsCache.clear();
}

async function fetchOrgPullRequests(
  octokit,
  githubConfig,
  forkOwners,
  sessionSelectedState,
  cache,
  maxItems = Infinity,
) {
  const states =
    sessionSelectedState === "open" ? ["OPEN"] : ["CLOSED", "MERGED"];
  const key = `${forkOwners ? [...forkOwners].sort().join(",") : "*"}|${sessionSelectedState}`;
  const entry = orgPullRequestsCache.get(key) || {
    nodes: [],
    after: null,
    done: false,
    inflight: null,
  };
  orgPullRequestsCache.set(key, entry);

  while (!entry.done && entry.nodes.length < maxItems) {
    if (entry.inflight) {
      await entry.inflight;
      continue;
    }

    entry.inflight = octokit
      .graphql(ORG_PULL_REQUESTS_QUERY, {
        owner: githubConfig.username,
        repo: githubConfig.repo,
        states,
        perPage: 100,
        after: entry.after,
        headers: {
          ...(cache ? {} : { "If-None-Match": "" }),
        },
      })
      .then((response) => {
        const { pageInfo, nodes } = response.repository.pullRequests;
        for (const node of nodes) {
          if (
            !forkOwners ||
            forkOwners.includes(node.headRepositoryOwner?.login)
          )
            entry.nodes.push(node);
        }
        entry.after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
        entry.done = !pageInfo.hasNextPage;
      })
      .finally(() => {
        entry.inflight = null;
      });

    await entry.inflight;
  }

  return entry.nodes;
}

const AFFILIATED_FORKS_QUERY = `
  query($owner: String!, $repo: String!, $after: String) {
    repository(owner: $owner, name: $repo) {
      forks(first: 100, after: $after, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          isPrivate
          viewerPermission
          owner {
            login
            __typename
          }
        }
      }
    }
  }
`;

export async function affiliatedForks(octokit, githubConfig) {
  const forks = [];
  let after = null;

  do {
    const response = await octokit.graphql(AFFILIATED_FORKS_QUERY, {
      owner: githubConfig.username,
      repo: githubConfig.repo,
      after,
    });
    const { pageInfo, nodes } = response.repository.forks;

    for (const node of nodes) {
      if (node.name !== githubConfig.repo) continue;
      const permission = node.viewerPermission;
      forks.push({
        owner: node.owner.login,
        ownerType: node.owner.__typename,
        viewerPermission: permission,
        permissions: {
          admin: permission === "ADMIN",
          push: ["ADMIN", "MAINTAIN", "WRITE"].includes(permission),
          pull: true,
        },
      });
    }

    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);

  return forks;
}

export async function orgSessionsList(
  octokit,
  githubConfig,
  forkOwners,
  pageInfo,
  cursorPosition,
  sessionSelectedState,
  cache,
) {
  try {
    const perPage = 10;
    let page = 1;
    if (cursorPosition === "endCursor") page = Number(pageInfo?.endCursor) + 1;
    else if (cursorPosition === "startCursor")
      page = Number(pageInfo?.startCursor) - 1;
    else if (cursorPosition) page = Number(cursorPosition) + 1;
    if (!page || page < 1) page = 1;

    const nodes = await fetchOrgPullRequests(
      octokit,
      githubConfig,
      forkOwners,
      sessionSelectedState,
      cache,
      page * perPage + 1,
    );
    const start = (page - 1) * perPage;
    const items = nodes.slice(start, start + perPage).map(mapPullRequestNode);

    return {
      data: items,
      pageInfo: {
        hasNextPage: nodes.length > page * perPage,
        hasPreviousPage: page > 1,
        startCursor: String(page),
        endCursor: String(page),
      },
    };
  } catch (error) {
    return error;
  }
}

export async function orgNumberOfOpenClosedSessions(
  octokit,
  githubConfig,
  forkOwners,
  cache,
) {
  try {
    const [open, closed] = await Promise.all([
      fetchOrgPullRequests(octokit, githubConfig, forkOwners, "open", cache),
      fetchOrgPullRequests(octokit, githubConfig, forkOwners, "closed", cache),
    ]);
    return { open: open.length, closed: closed.length };
  } catch (error) {
    return error;
  }
}

export async function sessionsList(
  octokit,
  githubConfig,
  pageInfo,
  cursorPosition,
  sessionSelectedState,
  sessionName,
  cache,
  creator,
) {
  try {
    // TODO: Remove once next level (file editor view) is amde
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const query = `
      query($queryString: String!, $perPage: Int!, $after: String, $before: String) {
        search(query: $queryString, type: ISSUE, last: $perPage, before: $before, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
            hasPreviousPage
            startCursor
          }
    			issueCount
          nodes {
            ... on PullRequest {
              id
              title
              url
              state
              number
              changedFiles
              createdAt
              updatedAt
              isDraft
              author {
                login
              }
              headRepositoryOwner {
                login
              }
            }
          }
        }
      }
    `;

    const response = await octokit.graphql(query, {
      queryString: `${sessionName}repo:${githubConfig.username}/${githubConfig.repo} is:pr author:${creator} state:${sessionSelectedState}`,
      perPage: 10,
      after:
        cursorPosition === "endCursor"
          ? pageInfo?.endCursor
          : cursorPosition === "startCursor" || cursorPosition === null
            ? null
            : cursorPosition,
      before: cursorPosition === "startCursor" ? pageInfo?.startCursor : null,
      headers: {
        ...(cache ? {} : { "If-None-Match": "" }),
      },
    });

    const items = response.search.nodes.map(mapPullRequestNode);

    return {
      data: items,
      pageInfo: response.search.pageInfo,
    };
  } catch (error) {
    return error;
  }
}

export async function numberOfOpenClosedSessions(
  octokit,
  githubConfig,
  cache,
  creator,
) {
  try {
    const query = `
      query($queryString: String!) {
        search(query: $queryString, type: ISSUE, first: 1, after: null) {
    			issueCount
        }
      }
    `;

    const openResponse = await octokit.graphql(query, {
      queryString: `repo:${githubConfig.username}/${githubConfig.repo} is:pr ${creator ? `author:${creator} ` : ""}state:open`,
      headers: {
        ...(cache ? {} : { "If-None-Match": "" }),
      },
    });

    const closedResponse = await octokit.graphql(query, {
      queryString: `repo:${githubConfig.username}/${githubConfig.repo} is:pr ${creator ? `author:${creator} ` : ""}state:closed`,
      headers: {
        ...(cache ? {} : { "If-None-Match": "" }),
      },
    });

    const openCount = openResponse.search.issueCount;
    const closedCount = closedResponse.search.issueCount;

    return {
      open: openCount,
      closed: closedCount,
    };
  } catch (error) {
    return error;
  }
}

async function numberOfSessionBasedOnTitle(octokit, githubConfig, prName) {
  try {
    const query = `
    query($queryString: String!) {
      search(query: $queryString, type: ISSUE, last: 1) {
        issueCount
      }
    }
  `;

    const response = await octokit.graphql(query, {
      queryString: `repo:${githubConfig.username}/${githubConfig.repo} in:title '${prName}' is:pr`,
    });
    return response.search.issueCount;
  } catch (error) {
    return error;
  }
}

export async function repoDetails(
  octokit,
  githubConfig,
  githubUserData,
  owner,
) {
  const { repo } = githubConfig;
  const { login } = githubUserData;
  try {
    const response = await octokit.rest.repos.get({
      owner: owner || login,
      repo,
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function checkForkRepo(
  forkOwner,
  repo,
  octokit,
  owner,
  loaderText = {},
  organization = null,
) {
  let fork;
  try {
    fork = await octokit.rest.repos.get({ owner: forkOwner, repo });
  } catch (error) {
    if (error.status === 404) {
      fork = await octokit.rest.repos.createFork({
        owner,
        repo,
        ...(organization ? { organization } : {}),
      });
      if (fork.data.name !== repo) {
        throw new Error(
          "A fork of the original repository already exists for your account",
        );
      }
      loaderText.innerText = "Creating fork repo...";

      // Wait for fork creation to be available and try 3 times
      let retries = 6;
      while (retries > 0) {
        try {
          if (retries === 5)
            loaderText.innerText = "Creating fork repo! Please be patient...";
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds
          fork = await octokit.rest.repos.get({ owner: forkOwner, repo });
          break;
        } catch (err) {
          retries--;
          if (retries === 0) {
            throw new Error(
              "Failed to retrieve forked repository after 3 attempts",
            );
          }
        }
      }
    } else {
      throw error;
    }
  }
}

export async function syncARepo(username, repo, octokit) {
  try {
    const forkRepo = await octokit.rest.repos.get({ owner: username, repo });
    const forkDefaultBranch = forkRepo.data.default_branch;

    await octokit.rest.repos.mergeUpstream({
      owner: username,
      repo,
      branch: forkDefaultBranch,
    });

    return forkDefaultBranch;
  } catch (error) {
    throw error;
  }
}

export async function checkForkRepoAndSync(
  octokit,
  githubConfig,
  forkOwner = null,
) {
  try {
    const { repo } = githubConfig;
    const owner =
      forkOwner || (await octokit.rest.users.getAuthenticated()).data.login;
    const fork = await octokit.rest.repos.get({ owner, repo });
    if (fork) {
      await syncARepo(owner, repo, octokit);
    }
  } catch (error) {
    return error;
  }
}

export async function createSession(
  octokit,
  githubConfig,
  prName,
  forkOwner = null,
) {
  const { username: owner, repo } = githubConfig;
  const username = (await octokit.rest.users.getAuthenticated()).data.login;
  const forkOwnerLogin = forkOwner || username;
  const organization = forkOwnerLogin !== username ? forkOwnerLogin : null;
  const slugifiedPrName = slugify(prName, {
    lower: true,
    strict: true,
  });
  const forkBranchName = `${username}/${slugifiedPrName}`;

  try {
    const loaderText = document.getElementById("loader-text");
    await checkForkRepo(
      forkOwnerLogin,
      repo,
      octokit,
      owner,
      loaderText,
      organization,
    );

    loaderText.innerText = "Updating forked repo...";
    const sourceRepo = await octokit.rest.repos.get({ owner, repo });
    const sourceDefaultBranch = sourceRepo.data.default_branch;
    const forkDefaultBranch = await syncARepo(forkOwnerLogin, repo, octokit);

    const forkDefaultBranchRef = await octokit.rest.git.getRef({
      owner: forkOwnerLogin,
      repo,
      ref: `heads/${forkDefaultBranch}`,
    });

    const latestCommitSha = forkDefaultBranchRef.data.object.sha;

    loaderText.innerText = "Creating new branch...";
    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner: forkOwnerLogin,
      repo,
      commit_sha: latestCommitSha,
    });
    const treeSha = latestCommit.tree.sha;

    await octokit.rest.git.createRef({
      owner: forkOwnerLogin,
      repo,
      ref: `refs/heads/${forkBranchName}`,
      sha: latestCommitSha,
    });

    loaderText.innerText = "Adding first commit to branch...";
    const emptyCommitMessage = "chore: create session using empty commit";
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: forkOwnerLogin,
      repo,
      message: emptyCommitMessage,
      tree: treeSha,
      parents: [latestCommitSha],
    });

    await octokit.rest.git.updateRef({
      owner: forkOwnerLogin,
      repo,
      ref: `heads/${forkBranchName}`,
      sha: commit.sha,
      force: true,
    });

    loaderText.innerText = "Creating repo from new branch...";
    const res = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prName,
      head: `${forkOwnerLogin}:${forkBranchName}`,
      base: sourceDefaultBranch,
      draft: true,
    });

    return {
      text: `Successfully Created Session:  ${prName}`,
      status: "success",
      number: res.data.number,
      forkOwner: forkOwnerLogin,
    };
  } catch (error) {
    if (error.status === 422 && error.response?.url?.includes("/refs")) {
      const numberOfSession = await numberOfSessionBasedOnTitle(
        octokit,
        githubConfig,
        `${prName} (`,
      );

      if (numberOfSession.message) {
        return {
          text: numberOfSession.message,
          status: "error",
        };
      } else {
        const newSessionName = `${prName} (${numberOfSession + 1})`;
        return createSession(octokit, githubConfig, newSessionName, forkOwner);
      }
    } else {
      return {
        text: error.message,
        status: "error",
      };
    }
  }
}

export async function sessionDetails(octokit, githubConfig, prNumber) {
  try {
    const response = await octokit.rest.pulls.get({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: prNumber,
      headers: {
        "If-None-Match": "",
      },
    });

    return response.data;
  } catch (error) {
    if (error.status === 404) {
      console.error(
        "Either `basePath` is set incorrectly in config.js, or the session number does not exist.",
      );
    }
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function deleteSession(octokit, githubConfig, prNumber) {
  try {
    const response = await octokit.rest.pulls.update({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: prNumber,
      state: "closed",
    });

    await octokit.rest.git.deleteRef({
      owner: response.data.head.repo.owner.login,
      repo: response.data.head.repo.name,
      ref: `heads/${response.data.head.ref}`,
    });

    return {
      text: `Successfully Deleted ${response.data.title}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function renameSession(octokit, githubConfig, prNumber, newName) {
  try {
    const response = await octokit.rest.pulls.update({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: prNumber,
      title: newName,
    });

    return {
      text: `Successfully Renamed ${response.data.title} to ${newName}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function reviewSession(
  octokit,
  githubConfig,
  prNumber,
  pullRequestId,
) {
  try {
    const response = await octokit.graphql(
      `
      mutation ($pullRequestId: ID!) {
        markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
          pullRequest {
            id
            title
          }
        }
      }
    `,
      {
        pullRequestId: pullRequestId,
      },
    );

    return {
      text: `Successfully requested to review - ${response.markPullRequestReadyForReview.pullRequest.title}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function checkStatus(octokit, githubConfig, sha) {
  try {
    const response = await octokit.rest.checks.listForRef({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      ref: sha,
    });

    const failedChecks = response.data.check_runs.filter(
      (check) => check.conclusion === "failure",
    );

    return failedChecks.length ? "failed" : "success";
  } catch (error) {
    return error;
  }
}

export async function sessionReviewStatus(octokit, githubConfig, prNumber) {
  try {
    const response = await octokit.rest.pulls.listReviews({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: prNumber,
    });

    return response.data.some((review) => review.state === "CHANGES_REQUESTED");
  } catch (error) {
    return error;
  }
}
