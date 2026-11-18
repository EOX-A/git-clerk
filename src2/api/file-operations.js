import { fileContent, deleteFileContent } from "./file-content.js";
import { publishGitBundle } from "./git-broker.js";

const conflict = (message) =>
  Object.assign(new Error(message), { status: 409 });

function checkPath(path) {
  // The broker builds provider URLs from paths. Don't allow URL or path escapes.
  if (
    /[\\%?#\x00-\x1f\x7f]/.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error(
      "This file path contains characters the Git broker cannot safely address.",
    );
}

export function branchFilePath(folder, name) {
  const filename = name.trim();
  if (!filename || filename.includes("/"))
    throw new Error("Enter a file name without a folder path.");
  const path = folder ? `${folder}/${filename}` : filename;
  checkPath(path);
  return path;
}

function checkBranch(context, session) {
  if (
    !session.canEdit ||
    !session.branch ||
    session.branch === session.baseBranch ||
    session.branch === context.repository.default_branch
  )
    throw new Error("This session is read-only.");
}

function currentFile(context, session, path) {
  return fileContent(context, { ...session, headSha: null }, path);
}

async function checkAvailable(context, session, path) {
  try {
    await currentFile(context, session, path);
  } catch (error) {
    if (error.status === 404) return;
    throw error;
  }
  throw conflict("A file or folder already has that name.");
}

async function writeNewFile(context, session, path, text, message) {
  await checkAvailable(context, session, path);
  const result = await publishGitBundle(
    context,
    {
      files: { [path]: text },
      commit_message: message,
      target_branch: session.branch,
      pr_title: session.title,
      pr_body: session.body,
    },
    session,
  );
  const file = result.files_committed?.find((entry) => entry.path === path);
  if (
    !file?.sha ||
    !result.commit_sha ||
    result.pr_number !== session.number ||
    result.branch !== session.branch
  )
    throw Object.assign(
      new Error(
        "The broker did not confirm the new file on this session. Check the file list before retrying.",
      ),
      { refresh: true },
    );
  return result.commit_sha;
}

async function readOriginal(context, session, path, expectedSha) {
  const current = await currentFile(context, session, path);
  if (!current.sha || (expectedSha && current.sha !== expectedSha))
    throw conflict(
      "This file changed in the repository. Refresh the file tree and try again.",
    );
  return current;
}

async function removeOriginal(context, session, path, sha) {
  const result = await deleteFileContent(context, session, path, sha);
  if (
    result.status !== "deleted" ||
    result.path !== path ||
    result.branch !== session.branch ||
    !result.commit_sha
  )
    throw Object.assign(
      new Error(
        "The broker did not confirm the deletion. Check the file list before retrying.",
      ),
      { refresh: true },
    );
  return result.commit_sha;
}

export async function createBranchFile(context, session, path) {
  checkBranch(context, session);
  checkPath(path);
  const commitSha = await writeNewFile(
    context,
    session,
    path,
    "",
    `chore: add ${path}`,
  );
  return { commitSha };
}

export async function renameBranchFile(
  context,
  session,
  path,
  destination,
  expectedSha,
) {
  checkBranch(context, session);
  checkPath(path);
  checkPath(destination);
  if (path === destination) return;
  const source = await readOriginal(context, session, path, expectedSha);
  if (source.text === null)
    throw new Error(
      "Only text files up to 1 MiB can be renamed with this Git broker.",
    );
  const copyCommitSha = await writeNewFile(
    context,
    session,
    destination,
    source.text,
    `chore: copy ${path} to ${destination}`,
  );
  // Rename is two commits with today's broker. Recheck before removing the old path.
  try {
    const original = await readOriginal(context, session, path, source.sha);
    const copy = await currentFile(context, session, destination);
    if (copy.sha !== original.sha)
      throw conflict("The new copy no longer matches the original.");
    const commitSha = await removeOriginal(
      context,
      session,
      path,
      original.sha,
    );
    return { commitSha, copyCommitSha };
  } catch (cause) {
    throw Object.assign(
      new Error(
        "The new file was saved, but removal of the original was not confirmed. Check both names in Files before retrying.",
        { cause },
      ),
      { refresh: true },
    );
  }
}

export async function removeBranchFile(context, session, path, expectedSha) {
  checkBranch(context, session);
  checkPath(path);
  const { sha } = await readOriginal(context, session, path, expectedSha);
  const commitSha = await removeOriginal(context, session, path, sha);
  return { commitSha };
}
