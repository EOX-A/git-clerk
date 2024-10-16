import { getTotalPages } from "../helpers";
import slugify from "slugify";

export async function sessionsList(octokit, githubConfig, currPage) {
  try {
    const response = await octokit.rest.pulls.list({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      state: "all",
      per_page: 10,
      page: currPage,
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

export async function createSession(octokit, githubConfig, name) {
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const username = user.login;

    const { data: repoInfo } = await octokit.rest.repos.get({
      owner: githubConfig.username,
      repo: githubConfig.repo,
    });
    const defaultBranch = repoInfo.default_branch;

    const branchName = `${username}/${slugify(name, { lower: true })}`;

    const { data: defaultBranchRef } = await octokit.rest.git.getRef({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      ref: `heads/${defaultBranch}`,
    });
    const latestCommitSha = defaultBranchRef.object.sha;

    await octokit.rest.git.createRef({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      ref: `refs/heads/${branchName}`,
      sha: latestCommitSha,
    });

    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      title: name,
      head: branchName,
      base: defaultBranch,
      draft: true,
    });

    return {
      text: `Successfully Created Session:  ${name}`,
      status: "success",
    };
  } catch (error) {
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
