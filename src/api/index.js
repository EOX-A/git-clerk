import { Octokit } from "octokit";
import {
  sessionsList,
  createSession,
  deleteSession,
  reviewSession,
  checkStatus,
  sessionReviewStatus,
  sessionDetails,
  renameSession,
  numberOfOpenClosedSessions,
  repoDetails,
  checkForkRepoAndSync,
  orgSessionsList,
  orgNumberOfOpenClosedSessions,
  affiliatedForks,
  clearOrgPullRequestsCache,
} from "@/api/session";
import useOctokitStore from "@/stores/octokit";
import {
  branchFileStructure,
  deleteFile,
  filesListFromSession,
  updateFile,
  fileDetails,
  schemaFromURL,
} from "@/api/file";
import { GIT_CLERK_CONFIG, FORK_LOCATION } from "@/enums";

export async function initOctokit() {
  try {
    const config = globalThis.ghConfig || GIT_CLERK_CONFIG.ghConfig;
    let configAuth;
    let configRepo;

    if (config) {
      configAuth =
        (config.githubAuthToken !== undefined &&
          (typeof config.githubAuthToken === "string" ||
          config.githubAuthToken instanceof String
            ? config.githubAuthToken
            : await config.githubAuthToken())) ||
        import.meta.env.GITCLERK_GITHUB_TOKEN;
      configRepo = config.githubRepo || import.meta.env.GITCLERK_GITHUB_REPO;
    } else {
      configAuth = import.meta.env.GITCLERK_GITHUB_TOKEN;
      configRepo = import.meta.env.GITCLERK_GITHUB_REPO;
    }

    if (!configAuth) {
      console.error("Missing ghConfig.githubAuthToken!");
    }

    if (!configRepo) {
      console.error("Missing ghConfig.githubRepo!");
    }

    const auth = configAuth;
    const username = configRepo.split("/")[0];
    const repoName = configRepo.split("/")[1];

    globalThis.ghConfig = {
      ...config,
      config: { auth, username, repo: repoName },
    };
    if (!globalThis.gitClerkConfig) globalThis.gitClerkConfig = {};
    globalThis.gitClerkConfig.ghConfig = globalThis.ghConfig;

    const octokit = new Octokit({ auth });

    const userData = await octokit.rest.users.getAuthenticated();

    let orgMemberships = [];
    if (FORK_LOCATION.org) {
      try {
        const orgData =
          await octokit.rest.orgs.listMembershipsForAuthenticatedUser({
            state: "active",
            per_page: 100,
          });
        orgMemberships = orgData.data;
      } catch (error) {
        console.warn(
          "Unable to list organisation memberships, continuing as individual:",
          error.message,
        );
      }
    }

    const githubConfig = { auth, username, repo: repoName };

    let githubTargetRepo = null;
    try {
      githubTargetRepo = (
        await octokit.rest.repos.get({ owner: username, repo: repoName })
      ).data;
    } catch (error) {
      console.warn("Unable to read the target repository:", error.message);
    }

    let githubOrgData = [userData.data, ...orgMemberships];
    if (FORK_LOCATION.org) {
      githubOrgData = await mergeAffiliatedForks(
        octokit,
        githubConfig,
        githubOrgData,
      );
    }

    return {
      githubConfig,
      githubUserData: userData.data,
      githubOrgData,
      githubTargetRepo,
      octokit,
    };
  } catch (error) {
    console.error(error);
  }
}

async function mergeAffiliatedForks(octokit, githubConfig, githubOrgData) {
  let forks;
  try {
    forks = await affiliatedForks(octokit, githubConfig);
  } catch (error) {
    console.warn(
      "Unable to list affiliated forks, checking each owner instead:",
      error.message,
    );
    return githubOrgData;
  }

  const loginOf = (entry, index) =>
    index === 0 ? entry.login : entry.organization?.login;

  for (const fork of forks) {
    const index = githubOrgData.findIndex(
      (entry, i) => loginOf(entry, i) === fork.owner,
    );

    if (index >= 0) {
      githubOrgData[index] = { ...githubOrgData[index], forked: fork };
      continue;
    }

    if (fork.ownerType !== "Organization" || !fork.permissions.push) continue;

    let organization = { login: fork.owner };
    try {
      organization = (await octokit.rest.orgs.get({ org: fork.owner })).data;
    } catch (error) {
      console.warn(
        `Unable to fetch organisation ${fork.owner}:`,
        error.message,
      );
    }

    githubOrgData.push({
      state: "active",
      role: fork.permissions.admin ? "admin" : "member",
      collaborator: true,
      organization,
      forked: fork,
    });
  }

  return githubOrgData;
}

export async function getLoginData() {
  return data;
}

export async function getRepoDetails(owner) {
  const { githubConfig, githubUserData, octokit } = useOctokitStore();
  return repoDetails(octokit, githubConfig, githubUserData, owner);
}

export async function getSessionsList(
  pageInfo,
  cursorPosition,
  sessionSelectedState = "open",
  cache,
) {
  const { githubConfig, githubUserData, octokit, scopeOwners } =
    useOctokitStore();
  const sessionNameValue = "";

  if (scopeOwners === null || scopeOwners.length) {
    return orgSessionsList(
      octokit,
      githubConfig,
      scopeOwners,
      pageInfo,
      cursorPosition,
      sessionSelectedState,
      cache,
    );
  }

  return sessionsList(
    octokit,
    githubConfig,
    pageInfo,
    cursorPosition,
    sessionSelectedState,
    sessionNameValue,
    cache,
    githubUserData.login,
  );
}

export async function searchSessionName(
  sessionName,
  pageInfo,
  cursorPosition,
  sessionSelectedState = "open",
  cache,
) {
  const { githubConfig, githubUserData, octokit } = useOctokitStore();
  const sessionNameValue = `${sessionName} `;
  return sessionsList(
    octokit,
    githubConfig,
    pageInfo,
    cursorPosition,
    sessionSelectedState,
    sessionNameValue,
    cache,
    githubUserData.login,
  );
}

export function clearSessionsCache() {
  clearOrgPullRequestsCache();
}

export async function getNumberOfOpenClosedSessions(cache) {
  const { githubConfig, githubUserData, octokit, scopeOwners } =
    useOctokitStore();

  if (scopeOwners === null) {
    return numberOfOpenClosedSessions(octokit, githubConfig, cache, null);
  }

  if (scopeOwners.length) {
    return orgNumberOfOpenClosedSessions(
      octokit,
      githubConfig,
      scopeOwners,
      cache,
    );
  }

  return numberOfOpenClosedSessions(
    octokit,
    githubConfig,
    cache,
    githubUserData.login,
  );
}

export async function getSessionDetails(sessionNumber) {
  const { githubConfig, octokit } = useOctokitStore();
  return sessionDetails(octokit, githubConfig, sessionNumber);
}

export async function deleteBySessionNumber(sessionNumber) {
  const { githubConfig, octokit } = useOctokitStore();
  return deleteSession(octokit, githubConfig, sessionNumber);
}

export async function renameBySessionNumber(sessionNumber, newName) {
  const { githubConfig, octokit } = useOctokitStore();
  return renameSession(octokit, githubConfig, sessionNumber, newName);
}

export async function reviewBySessionNumber(sessionNumber, pullRequestId) {
  const { githubConfig, octokit } = useOctokitStore();
  return reviewSession(octokit, githubConfig, sessionNumber, pullRequestId);
}

export async function getCheckStatus(sha) {
  const { githubConfig, octokit } = useOctokitStore();
  return checkStatus(octokit, githubConfig, sha);
}

export async function getSessionReviewStatus(sessionNumber) {
  const { githubConfig, octokit } = useOctokitStore();
  return sessionReviewStatus(octokit, githubConfig, sessionNumber);
}

export async function createSessionByName(name, forkOwner = null) {
  const { githubConfig, octokit } = useOctokitStore();
  return createSession(octokit, githubConfig, name, forkOwner);
}

export async function syncRepo(forkOwner = null) {
  const { githubConfig, octokit } = useOctokitStore();
  return checkForkRepoAndSync(octokit, githubConfig, forkOwner);
}

export async function getFilesListFromSession(sessionNumber, currPage, cache) {
  const { githubConfig, octokit } = useOctokitStore();

  return filesListFromSession(
    octokit,
    githubConfig,
    sessionNumber,
    currPage,
    cache,
  );
}

export async function deleteFileBySHA(owner, repo, path, message, sha, ref) {
  const { githubConfig, octokit } = useOctokitStore();
  return deleteFile(
    octokit,
    githubConfig,
    owner,
    repo,
    path,
    message,
    sha,
    ref,
  );
}

export async function getFileDetails(session, filePath, cache = true) {
  const { octokit } = useOctokitStore();
  const { head } = session;

  return fileDetails(
    octokit,
    head.repo.owner.login,
    head.repo.name,
    head.ref,
    filePath,
    cache,
  );
}

export async function getBranchFileStructure(session, path, noFiles = false) {
  const { githubConfig, octokit } = useOctokitStore();
  const { head } = session;

  return branchFileStructure(
    octokit,
    githubConfig,
    head.repo.owner.login,
    head.repo.name,
    head.ref,
    path,
    noFiles,
  );
}

export async function createAndUpdateFile(
  session,
  path,
  fileName,
  content,
  sha = null,
) {
  const { githubConfig, octokit } = useOctokitStore();
  const { head } = session;

  return updateFile(
    octokit,
    githubConfig,
    head.repo.owner.login,
    head.repo.name,
    head.ref,
    path,
    fileName,
    content,
    sha,
  );
}

export async function createAndUpdateMultipleFiles(session, path, files, sha) {
  const { githubConfig, octokit } = useOctokitStore();
  const { head } = session;
  const errorFiles = [];

  for (const file of files) {
    const fileName = file.newName || file.name;
    const fullFilePath = path + fileName;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const content = {
      data: bytes,
      type: "string",
    };

    const result = await updateFile(
      octokit,
      githubConfig,
      head.repo.owner.login,
      head.repo.name,
      head.ref,
      fullFilePath,
      fileName,
      content,
      sha,
    );

    if (result.status === "error") {
      errorFiles.push(fileName);
    }
  }

  if (errorFiles.length) {
    return {
      text: `Upload failed for following files: ${errorFiles.join(", ")}`,
      status: "error",
    };
  } else {
    return {
      text: "Uploaded successfully",
      status: "success",
    };
  }
}

export async function fetchSchemaFromURL(url) {
  return schemaFromURL(url);
}
