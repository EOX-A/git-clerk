import { Base64 } from "js-base64";
import { brokerAuthor, publishGitBundle } from "./git-broker.js";

export async function fileContent(context, session, path, signal) {
  const data = await context.request("/file", {
    query: {
      path: path.replace(/^\//, ""),
      ref: session.headSha || session.branch,
    },
    signal,
  });
  let text = null;
  let unavailable = "";
  if (data.encoding !== "base64" || data.size > 1024 * 1024) {
    unavailable =
      "This file is too large to edit here. Open it in the repository.";
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        Base64.toUint8Array(data.content),
      );
      if (text.includes("\0")) throw new Error("Binary file");
    } catch {
      text = null;
      unavailable =
        "This file is binary or is not UTF-8 text. Open it in the repository.";
    }
  }
  return {
    ...data,
    text,
    unavailable,
    owner: session.headOwner,
    repo: session.headRepo,
  };
}

export async function saveFileContent(context, session, path, text, sha) {
  if (!session.canEdit) throw new Error("This session is read-only.");
  // Publish does not take an expected blob SHA, so compare it with the current branch first.
  const latest = await context
    .request("/file", { query: { path, ref: session.branch } })
    .catch((error) => {
      if (error.status !== 404) throw error;
      return null;
    });
  if (!sha || latest?.sha !== sha)
    throw Object.assign(new Error("The file changed since it was opened."), {
      status: 409,
    });
  const result = await publishGitBundle(
    context,
    {
      files: { [path]: text },
      commit_message: `chore: update ${path}`,
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
    result.branch !== session.branch ||
    result.pr_number !== session.number
  )
    throw new Error(
      "The Git broker did not confirm the file save. Refresh the session to check its current state.",
    );
  return { sha: file.sha, commitSha: result.commit_sha };
}

export function fileDiff(context, session, path, signal) {
  return context.request(`/pulls/${session.number}/diff`, {
    query: { path },
    signal,
  });
}

export function deleteFileContent(context, session, path, sha) {
  if (!session.canEdit) throw new Error("This session is read-only.");
  if (!sha) throw new Error("Reload this file before deleting it.");
  return context.request("/file", {
    method: "DELETE",
    branch: session.branch,
    body: {
      branch: session.branch,
      path,
      sha,
      commit_message: `chore: delete ${path}`,
      author: brokerAuthor(context),
    },
  });
}
