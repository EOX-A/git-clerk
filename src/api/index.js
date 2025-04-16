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
import { GIT_CLERK_CONFIG } from "@/enums";

export async function initOctokit() {
  try {
    const config = globalThis.ghConfig || GIT_CLERK_CONFIG.ghConfig;
    let configAuth;
    let configRepo;

    if (config) {
      configAuth =
        (config.githubAuthToken !== undefined &&
          (config.githubAuthToken === "string"
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
    globalThis.gitClerkConfig.ghConfig = globalThis.ghConfig;

    const octokit = new Octokit({ auth });

    const { data } = await octokit.rest.users.getAuthenticated();

    return {
      githubConfig: { auth, username, repo: repoName },
      githubUserData: data,
      octokit,
    };
  } catch (error) {
    console.error(error);
  }
}

export async function getLoginData() {
  return data;
}

export async function getSessionsList(
  pageInfo,
  cursorPosition,
  sessionSelectedState = "open",
  cache,
) {
  const { githubConfig, githubUserData, octokit } = useOctokitStore();
  return sessionsList(
    octokit,
    githubConfig,
    pageInfo,
    cursorPosition,
    sessionSelectedState,
    cache,
    githubUserData.login,
  );
}

export async function getNumberOfOpenClosedSessions(cache) {
  const { githubConfig, githubUserData, octokit } = useOctokitStore();
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

export async function createSessionByName(name) {
  const { githubConfig, octokit } = useOctokitStore();
  return createSession(octokit, githubConfig, name);
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

    const result = await updateFile(
      octokit,
      githubConfig,
      head.repo.owner.login,
      head.repo.name,
      head.ref,
      fullFilePath,
      fileName,
      { bytes },
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
