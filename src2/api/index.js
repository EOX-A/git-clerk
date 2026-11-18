import { publishChatFiles } from "./chat-publish.js";
import { generateChatTest, generatePresetTest, streamChat } from "./agentic.js";
import { createSession } from "./session-create.js";
import {
  fileContent,
  saveFileContent,
  deleteFileContent,
  fileDiff,
} from "./file-content.js";
import { initGitBroker } from "./git-broker.js";
import { sessionsList, sessionDetails } from "./session.js";
import { updateSession } from "./session-actions.js";
import { sessionFiles, branchDirectory } from "./file.js";
import useGitStore from "@/stores/git.js";
import {
  chatContextIncludes,
  chatContextContent,
} from "@/helpers/chat-config.js";

export async function connectGitBroker() {
  const store = useGitStore();
  store.setContext(await initGitBroker(store.config));
}

export function getSessionsList(after = null, signal) {
  return sessionsList(useGitStore().context, after, signal);
}

export function getSessionDetails(number, signal) {
  return sessionDetails(useGitStore().context, number, signal);
}

export function updateSessionDetails(number, action, title) {
  return updateSession(useGitStore().context, number, action, title);
}

export function getSessionFiles(session, signal) {
  return sessionFiles(useGitStore().context, session, signal);
}

export function getBranchDirectory(session, path, signal) {
  return branchDirectory(useGitStore().context, session, path, signal);
}

export function getFileContent(session, path, signal) {
  return fileContent(useGitStore().context, session, path, signal);
}
export function saveFile(session, path, text, sha) {
  return saveFileContent(useGitStore().context, session, path, text, sha);
}
export function deleteFile(session, path, sha) {
  return deleteFileContent(useGitStore().context, session, path, sha);
}
export function getFileDiff(session, path, signal) {
  return fileDiff(useGitStore().context, session, path, signal);
}
export async function fetchFileSchema(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Could not load the file schema.");
  return response.json();
}

export function createSessionByName(name, attempt, onProgress) {
  return createSession(useGitStore().context, name, attempt, onProgress);
}

export function sendChatTest(prompt, signal) {
  return generateChatTest(prompt, signal);
}

export function sendPresetTest(prompt, signal) {
  return generatePresetTest(prompt, signal);
}

export { streamChat };
export function publishChatDraft(bundle, attempt, session) {
  return publishChatFiles(useGitStore().context, bundle, attempt, session);
}

export async function readSessionDraft(session, signal) {
  const context = useGitStore().context;
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
