import { Octokit } from "octokit";
import { sessionsList, deleteSession } from "@/api/session";

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

export async function getSessionsList(currPage) {
  return sessionsList(octokit, githubConfig, currPage);
}

export async function deleteBySessionNumber(sessionNumber) {
  return deleteSession(octokit, githubConfig, sessionNumber);
}
