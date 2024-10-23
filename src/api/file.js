import { getTotalPages } from "@/helpers/index.js";

export async function filesListFromSession(
  octokit,
  githubConfig,
  prNumber,
  currPage,
  cache,
) {
  try {
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
