import { checkDraftFiles } from "./draft-files.js";
import { brokerAuthor, publishGitBundle } from "./git-broker.js";
import { createDraftSession } from "./session-create.js";
import { sessionDetails } from "./session.js";
import { fileContent } from "./file-content.js";
import { gitBlobSha } from "../helpers/file-publication.js";
import { getChatConfig } from "../helpers/chat-config.js";
import { chatPrTitle } from "../helpers/chat-output.js";

function formatChatPrBody(baseBody, filePaths = []) {
  const base =
    baseBody?.trim() ||
    "## Summary\n\nDraft changes prepared in Git Clerk.\n\n## Notes\n\n- Review the modified files and metadata before merging.";
  if (!filePaths.length) return base;
  const fileList = filePaths.map((path) => `- \`${path}\``).join("\n");
  return `${base}\n\n### Files\n\n${fileList}`;
}

export async function publishChatFiles(context, bundle, attempt = {}, session) {
  const config = getChatConfig();
  if (
    !config.publishing.enabled ||
    (session && !config.publishing.updateExistingSession)
  )
    throw new Error("Chat publishing is disabled for this operation.");
  if (
    session &&
    (!session.canEdit ||
      !session.branch ||
      session.branch === session.baseBranch ||
      session.branch === context.repository.default_branch)
  )
    throw new Error(
      "This session is read-only. Reopen it before saving AI edits.",
    );

  if (!session && context.repository.permissions?.push === false)
    throw new Error(
      "This repository is read-only for your current Git broker credentials.",
    );

  const entries = checkDraftFiles(bundle);
  const files = Object.fromEntries(
    entries.map(([path, content]) => [
      path,
      typeof content === "string"
        ? content
        : JSON.stringify(content, null, 2) + "\n",
    ]),
  );
  const defaultPrBody = formatChatPrBody(
    config.publishing.prBody,
    Object.keys(files),
  );
  const target = `${context.repository.repo}:${session?.number ?? "new"}:${session?.branch ?? ""}`;
  if (attempt.target && attempt.target !== target)
    throw new Error("Return to the original session to retry this save.");
  attempt.target = target;

  if (!session && !attempt.draftSession) {
    const { username } = brokerAuthor(context);
    attempt.creation ||= {};
    try {
      // The broker's initial_files only creates files. Publish also handles updates.
      attempt.draftSession = await createDraftSession(
        context,
        {
          title: chatPrTitle(config.publishing.prTitle, bundle.draft, username),
          branchTitle: bundle.draft.title,
          body: defaultPrBody,
        },
        attempt.creation,
      );
    } catch (error) {
      attempt.requested = Boolean(
        attempt.creation.number || attempt.creation.uncertain,
      );
      throw error;
    }
  }
  const targetSession = session || attempt.draftSession;
  if (!session) {
    attempt.requested = true;
    if (
      !targetSession.canEdit &&
      context.repository.permissions?.push === false
    )
      throw new Error(
        "This repository is read-only for your current Git broker credentials.",
      );
    if (
      targetSession.status !== "draft" ||
      !targetSession.canEdit ||
      !targetSession.headSha ||
      targetSession.branch !== attempt.creation.branch
    )
      throw new Error("The broker did not confirm the expected draft session.");
  }

  if (!attempt.result && !attempt.uncertain) {
    attempt.requested = true;
    attempt.beforeSha = targetSession.headSha;
    try {
      const result = await publishGitBundle(
        context,
        {
          target_branch: targetSession.branch,
          files,
          commit_message: `${session ? "Update" : "Create"} ${bundle.draft.title}`,
          pr_title: targetSession.title,
          pr_body: targetSession.body ?? defaultPrBody,
        },
        targetSession,
      );
      if (
        !result.commit_sha ||
        result.branch !== targetSession.branch ||
        result.pr_number !== targetSession.number
      )
        throw new Error(
          "The broker did not confirm the expected session and commit.",
        );
      attempt.result = result;
    } catch (error) {
      attempt.uncertain = !error.status || error.status >= 500;
      attempt.requested = Boolean(attempt.draftSession) || attempt.uncertain;
      if (!attempt.uncertain) throw error;
    }
  }
  if (!attempt.result && attempt.uncertain) {
    // A failed publish response can arrive after the commit landed. Read back before reporting success.
    const saved = await sessionDetails(context, targetSession.number);
    if (
      saved.number !== targetSession.number ||
      !saved.headSha ||
      saved.branch !== targetSession.branch ||
      saved.headSha === targetSession.headSha
    )
      throw new Error(
        "The broker has not confirmed the previous save. Refresh the session or inspect the repository before retrying.",
      );
    for (const [path, text] of Object.entries(files)) {
      if ((await fileContent(context, saved, path)).text !== text)
        throw new Error(
          "The session does not match the attempted save. Refresh it before making more edits.",
        );
    }
    attempt.result = {
      pr_number: saved.number,
      commit_sha: saved.headSha,
      branch: saved.branch,
    };
    attempt.session = saved;
  }
  const {
    pr_number: number,
    commit_sha: commitSha,
    files_committed: committed,
  } = attempt.result;
  const published = attempt.session || (await sessionDetails(context, number));
  if (
    published.branch !== targetSession.branch ||
    published.headSha !== commitSha ||
    (!session && published.status !== "draft")
  )
    throw new Error(
      "The session no longer matches the confirmed save. Refresh the session to see its current state.",
    );
  const documents = Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(async ([path, text]) => [
        path,
        {
          text,
          owner: published.headOwner,
          repo: published.headRepo,
          sha:
            committed?.find((file) => file.path === path)?.sha ||
            (await gitBlobSha(text)),
        },
      ]),
    ),
  );
  return {
    session: published,
    beforeSha: attempt.result.base_commit_sha || attempt.beforeSha,
    commitSha,
    files: entries.map(([path]) => ({ path })),
    documents,
  };
}
