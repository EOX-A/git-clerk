import { Octokit } from "octokit";
import {
  sessionsList,
  createSession,
  deleteSession,
  reviewSession,
  checkStatus,
  sessionReviewStatus,
} from "@/api/session";

const githubConfig = {
  auth: import.meta.env.VUE_APP_GITHUB_TOKEN,
  username: import.meta.env.VUE_APP_GITHUB_OWNER,
  repo: import.meta.env.VUE_APP_GITHUB_REPO,
};

const octokit = new Octokit({ auth: githubConfig.auth });

const { data } = await octokit.rest.users.getAuthenticated();

export async function getLoginData() {
  return data;
}

export async function getSessionsList(currPage, cache) {
  return sessionsList(octokit, githubConfig, currPage, cache, data.login);
}

export async function deleteBySessionNumber(sessionNumber) {
  return deleteSession(octokit, githubConfig, sessionNumber);
}

export async function reviewBySessionNumber(sessionNumber, pullRequestId) {
  return reviewSession(octokit, githubConfig, sessionNumber, pullRequestId);
}

export async function getCheckStatus(sessionNumber) {
  return checkStatus(octokit, githubConfig, sessionNumber);
}

export async function getSessionReviewStatus(sessionNumber) {
  return sessionReviewStatus(octokit, githubConfig, sessionNumber);
}

export async function createSessionByName(name) {
  return createSession(octokit, githubConfig, name);
}
