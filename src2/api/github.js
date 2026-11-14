import { Octokit } from "octokit";
import { affiliatedForkOwners } from "./session.js";

export async function initOctokit(
  config = globalThis.ghConfig || globalThis.gitClerkConfig?.ghConfig || {},
  env = import.meta.env || {},
  forkingLocation = globalThis.forkingLocation ||
    globalThis.gitClerkConfig?.forkingLocation || {
      personal: true,
      org: false,
    },
) {
  const token =
    (typeof config.githubAuthToken === "function"
      ? await config.githubAuthToken()
      : config.githubAuthToken) || env.GITCLERK_GITHUB_TOKEN;
  const repository = config.githubRepo || env.GITCLERK_GITHUB_REPO;

  if (!token || !repository) {
    const error = new Error("GitHub configuration is missing.");
    error.code = "GITHUB_CONFIG_MISSING";
    throw error;
  }
  if (
    typeof repository !== "string" ||
    !/^[^/\s]+\/[^/\s]+$/.test(repository)
  ) {
    const error = new Error("GitHub repository must be owner/repository.");
    error.code = "GITHUB_CONFIG_INVALID";
    throw error;
  }

  const [username, repo] = repository.split("/");
  const octokit = new Octokit({ auth: token });
  const [userResponse, repoResponse] = await Promise.all([
    octokit.rest.users.getAuthenticated(),
    octokit.rest.repos.get({ owner: username, repo }),
  ]);
  const githubUserData = userResponse.data;
  const githubTargetRepo = repoResponse.data;
  const githubConfig = { username, repo };

  // Match v1's default scope: target writers see all PRs; others see their forks.
  let scopeOwners = null;
  if (
    !githubTargetRepo.permissions?.push &&
    !githubTargetRepo.permissions?.admin
  ) {
    scopeOwners =
      forkingLocation.personal !== false ? [githubUserData.login] : [];
    if (forkingLocation.org) {
      scopeOwners.push(...(await affiliatedForkOwners(octokit, githubConfig)));
    }
    scopeOwners = [...new Set(scopeOwners.map((owner) => owner.toLowerCase()))];
  }

  return { octokit, githubConfig, githubUserData, scopeOwners };
}
