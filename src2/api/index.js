import { initOctokit } from "./github.js";
import { sessionsList, sessionDetails } from "./session.js";
import { updateSession } from "./session-actions.js";
import { sessionFiles, branchRoot, branchDirectory } from "./file.js";
import useOctokitStore from "@/stores/octokit.js";

// Keep the UI-facing contract here when GitHub operations move to the backend.
export async function connectGitHub() {
  const context = await initOctokit();
  useOctokitStore().setOctokit(context);
}

export function getSessionsList(after = null, signal) {
  return sessionsList(useOctokitStore().context, after, signal);
}

export function getSessionDetails(number, signal) {
  return sessionDetails(useOctokitStore().context, number, signal);
}

export function updateSessionDetails(number, action, title) {
  return updateSession(useOctokitStore().context, number, action, title);
}

export function getSessionFiles(session, signal) {
  return sessionFiles(useOctokitStore().context, session, signal);
}

export function getBranchRoot(session, signal) {
  return branchRoot(useOctokitStore().context, session, signal);
}

export function getBranchDirectory(source, treeSha, path, signal) {
  return branchDirectory(
    useOctokitStore().context,
    source,
    treeSha,
    path,
    signal,
  );
}
