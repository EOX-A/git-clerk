import { initOctokit } from "./github.js";
import { sessionsList, sessionDetails } from "./session.js";
import useOctokitStore from "@/stores/octokit.js";

// Keep the UI-facing contract here when GitHub operations move to the backend.
export async function connectGitHub() {
  const context = await initOctokit();
  useOctokitStore().setOctokit(context);
}

export function getSessionsList(after = null) {
  return sessionsList(useOctokitStore().context, after);
}

export function getSessionDetails(number) {
  return sessionDetails(useOctokitStore().context, number);
}
