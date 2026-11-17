import { publishChatFiles } from "./chat-publish.js";
import { generateChatTest, generatePresetTest, streamChat } from "./agentic.js";
import { createPersonalSession } from "./session-create.js";
import { fileContent, saveFileContent, fileDiff } from "./file-content.js";
import { initOctokit } from "./github.js";
import { sessionsList, sessionDetails } from "./session.js";
import { updateSession } from "./session-actions.js";
import { sessionFiles, branchRoot, branchDirectory } from "./file.js";
import useOctokitStore from "@/stores/octokit.js";
import {
  chatContextIncludes,
  chatContextContent,
} from "@/helpers/chat-config.js";

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

export function sendChatTest(prompt, signal) {
  return generateChatTest(prompt, signal);
}

export function sendPresetTest(prompt, signal) {
  return generatePresetTest(prompt, signal);
}

export { streamChat };
export function publishChatDraft(bundle, attempt, session) {
  return publishChatFiles(useOctokitStore().context, bundle, attempt, session);
}

export async function readSessionDraft(session, signal) {
  const context = useOctokitStore().context;
  const { files, incomplete } = await sessionFiles(context, session, signal);
  if (incomplete)
    throw new Error(
      "The changed-file list is incomplete. Refresh the session before using chat.",
    );
  const paths = files.filter(
    (file) => file.status !== "removed" && chatContextIncludes(file.path),
  );
  if (paths.length > 100)
    throw new Error("This session has too many files for one chat request.");
  if (!paths.length) return null;
  const contents = {};
  let size = 0;
  for (const { path } of paths) {
    const content = await fileContent(context, session, path, signal);
    if (content.text === null) continue;
    size += content.text.length;
    if (size > 200_000)
      throw new Error(
        "This session's files are too large for one chat request.",
      );
    contents[path] = chatContextContent(content.text, path);
  }
  return { title: session.title, files: contents };
}
