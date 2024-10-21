import { Octokit } from "octokit";
import {
  sessionsList,
  deleteSession,
  reviewSession,
  checkStatusFromRefHead,
  sessionReviewStatus,
} from "@/api/session";
import config from "@/../config.js";

const auth = await config.githubAuthToken();
const username = config.githubOwner;
const repo = config.githubRepo;

const githubConfig = { auth, username, repo };

const octokit = new Octokit({ auth: githubConfig.auth });

const { data } = await octokit.rest.users.getAuthenticated();

export async function getLoginData() {
  return data;
}

export async function getSessionsList(currPage) {
  return sessionsList(octokit, githubConfig, currPage);
}

export async function deleteBySessionNumber(sessionNumber) {
  return deleteSession(octokit, githubConfig, sessionNumber);
}

export async function reviewBySessionNumber(sessionNumber, pullRequestId) {
  return reviewSession(octokit, githubConfig, sessionNumber, pullRequestId);
}

export async function getCheckStatusFromRefHead(refSHA) {
  return checkStatusFromRefHead(octokit, githubConfig, refSHA);
}

export async function getSessionReviewStatus(sessionNumber) {
  return sessionReviewStatus(octokit, githubConfig, sessionNumber);
}
