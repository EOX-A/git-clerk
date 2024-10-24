import { getTotalPages } from "@/helpers/index.js";

export async function filesListFromSession(
  octokit,
  githubConfig,
  prNumber,
  currPage,
  cache,
) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await octokit.rest.pulls.listFiles({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      pull_number: prNumber,
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

export async function deleteFile(
  octokit,
  githubConfig,
  owner,
  repo,
  path,
  message,
  sha,
  ref,
) {
  try {
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      branch: ref,
    });

    return {
      text: `Successfully Deleted ${path}`,
      status: "success",
    };
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}

export async function branchFileStructure(
  octokit,
  githubConfig,
  owner,
  repo,
  ref,
  path,
) {
  const dirStructure = {};

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      ref,
      path,
    });

    for (const item of data) {
      if (item.type === "dir") {
        dirStructure[item.name] = await branchFileStructure(
          octokit,
          githubConfig,
          owner,
          repo,
          ref,
          item.path,
        );
      }
    }

    return dirStructure;
  } catch (error) {
    return {
      text: error.message,
      status: "error",
    };
  }
}
