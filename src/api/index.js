import { Octokit } from "octokit";
import {
  sessionsList,
  createSession,
  deleteSession,
  reviewSession,
  checkStatus,
  sessionReviewStatus,
  sessionDetails,
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

export async function initOctokit() {
  try {
    const config = globalThis.ghConfig;
    const auth =
      (await config.githubAuthToken()) || import.meta.env.VUE_APP_GITHUB_TOKEN;
    const repo = config.githubRepo || import.meta.env.VUE_APP_GITHUB_REPO;
    const username = repo.split("/")[0];
    const repoName = repo.split("/")[1];

    globalThis.ghConfig = {
      ...config,
      config: { auth, username, repo: repoName },
    };

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

export async function getSessionsList(currPage, cache) {
  const { githubConfig, githubUserData, octokit } = useOctokitStore();
  return sessionsList(
    octokit,
    githubConfig,
    currPage,
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

export async function reviewBySessionNumber(sessionNumber, pullRequestId) {
  const { githubConfig, octokit } = useOctokitStore();
  return reviewSession(octokit, githubConfig, sessionNumber, pullRequestId);
}

export async function getCheckStatus(sessionNumber) {
  const { githubConfig, octokit } = useOctokitStore();
  return checkStatus(octokit, githubConfig, sessionNumber);
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
  sha,
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
