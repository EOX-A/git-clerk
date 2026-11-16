import { createPersonalSession } from "./session-create.js";
import { fileContent, saveFileContent, fileDiff } from "./file-content.js";
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

export function getFileContent(session, path, signal) {
  return fileContent(useOctokitStore().context, session, path, signal);
}
export function saveFile(session, path, text, sha) {
  return saveFileContent(useOctokitStore().context, session, path, text, sha);
}
export function getFileDiff(session, path, signal) {
  return fileDiff(useOctokitStore().context, session, path, signal);
}
export async function fetchFileSchema(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Could not load the file schema.");
  return response.json();
}

export function createSessionByName(name, attempt, onProgress) {
  return createPersonalSession(
    useOctokitStore().context,
    name,
    attempt,
    onProgress,
  );
}
