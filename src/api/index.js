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
} from "@/api/file";

export async function initOctokit() {
  try {
    const config = globalThis.ghConfig;
    const auth =
      (await config.githubAuthToken()) || import.meta.env.VUE_APP_GITHUB_TOKEN;
    const username = config.githubOwner || import.meta.env.VUE_APP_GITHUB_OWNER;
    const repo = config.githubRepo || import.meta.env.VUE_APP_GITHUB_REPO;

    const octokit = new Octokit({ auth });

    const { data } = await octokit.rest.users.getAuthenticated();

    return {
      githubConfig: { auth, username, repo },
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

export async function getBranchFileStructure(session, path) {
  const { githubConfig, octokit } = useOctokitStore();
  const { head } = session;

  return branchFileStructure(
    octokit,
    githubConfig,
    head.repo.owner.login,
    head.repo.name,
    head.ref,
    path,
  );
}

export async function createAndUpdateFile(session, path, fileName, content) {
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
  );
}
