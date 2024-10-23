import { Octokit } from "octokit";
import {
  sessionsList,
  createSession,
  deleteSession,
  reviewSession,
  checkStatus,
  sessionReviewStatus,
} from "@/api/session";
import useOctokitStore from "@/stores/octokit";

export async function initOctokit() {
  try {
    const config = window.ghConfig;
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
