export async function sessionsList(octokit, githubConfig) {
  try {
    const response = await octokit.rest.pulls.list({
      owner: githubConfig.username,
      repo: githubConfig.repo,
      state: "all",
    });

    return response.data;
  } catch (error) {}
}
