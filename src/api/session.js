import { getTotalPages } from "../helpers";
import slugify from "slugify";

export async function sessionsList(octokit, githubConfig, currPage, cache) {
  try {
    const response = await octokit.rest.pulls.list({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      state: "all",
      per_page: 10,
      page: currPage,
      headers: {
        ...(cache ? {} : { "If-None-Match": "" }),
      },
    });

    const totalPages = getTotalPages(response.headers.link) || currPage;

    return {
      data: response.data,
      total: totalPages,
      curr: currPage,
      next: totalPages === currPage ? null : currPage + 1,
      prev: currPage > 1 ? currPage - 1 : null,
    };
  } catch (error) {
    return error;
  }
}

export async function createSession(octokit, githubConfig, prName) {
  const { username: owner, repo } = githubConfig;
  const username = (await octokit.rest.users.getAuthenticated()).data.login;
  const slugifiedPrName = slugify(prName, { lower: true });
  const forkBranchName = `${username}/${slugifiedPrName}`;

  try {
    let fork;
    try {
      fork = await octokit.rest.repos.get({ owner: username, repo });
    } catch (error) {
      if (error.status === 404) {
        fork = await octokit.rest.repos.createFork({ owner, repo });

        // Wait for fork creation to be available and try 3 times
        let retries = 3;
        while (retries > 0) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
            fork = await octokit.rest.repos.get({ owner: username, repo });
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

    const sourceRepo = await octokit.rest.repos.get({ owner, repo });
    const sourceDefaultBranch = sourceRepo.data.default_branch;

    const forkRepo = await octokit.rest.repos.get({ owner: username, repo });
    const forkDefaultBranch = forkRepo.data.default_branch;

    await octokit.rest.repos.mergeUpstream({
      owner: username,
      repo,
      branch: forkDefaultBranch,
    });

    const forkDefaultBranchRef = await octokit.rest.git.getRef({
      owner: username,
      repo,
      ref: `heads/${forkDefaultBranch}`,
    });

    const latestCommitSha = forkDefaultBranchRef.data.object.sha;

    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner: username,
      repo,
      commit_sha: latestCommitSha,
    });
    const treeSha = latestCommit.tree.sha;

    await octokit.rest.git.createRef({
      owner: username,
      repo,
      ref: `refs/heads/${forkBranchName}`,
      sha: latestCommitSha,
    });

    const emptyCommitMessage = "chore: create session using empty commit";
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: username,
      repo,
      message: emptyCommitMessage,
      tree: treeSha,
      parents: [latestCommitSha],
    });

    await octokit.rest.git.updateRef({
      owner: username,
      repo,
      ref: `heads/${forkBranchName}`,
      sha: commit.sha,
      force: true,
    });

    const draftPR = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prName,
      head: `${username}:${forkBranchName}`,
      base: sourceDefaultBranch,
      draft: true,
    });

    return {
      text: `Successfully Created Session:  ${prName}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message.replaceAll("Reference", "Session"),
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

export async function checkStatusFromRefHead(octokit, githubConfig, refSHA) {
  try {
    const response = await octokit.rest.checks.listForRef({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      ref: refSHA,
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
