import { checkDraftFiles } from "./draft-files.js";
import { brokerAuthor, publishGitBundle } from "./git-broker.js";
import { createDraftSession } from "./session-create.js";
import { sessionDetails } from "./session.js";
import { fileContent } from "./file-content.js";
import { gitBlobSha } from "../helpers/file-publication.js";
import { getChatConfig } from "../helpers/chat-config.js";
import { chatPrTitle } from "../helpers/chat-output.js";

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

  const entries = checkDraftFiles(bundle);
  const files = Object.fromEntries(
    entries.map(([path, content]) => [
      path,
      typeof content === "string"
        ? content
        : JSON.stringify(content, null, 2) + "\n",
    ]),
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
          body: config.publishing.prBody,
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
      targetSession.status !== "draft" ||
      !targetSession.canEdit ||
      !targetSession.headSha ||
      targetSession.branch !== attempt.creation.branch
    )
      throw new Error("The broker did not confirm the expected draft PR.");
  }

  if (!attempt.result && attempt.uncertain) {
    // A failed connection can hide a completed write. Retry only the readback.
    const saved = await sessionDetails(context, targetSession.number);
    if (
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
  if (!attempt.result) {
    attempt.requested = true;
    try {
      const result = await publishGitBundle(
        context,
        {
          target_branch: targetSession.branch,
          files,
          commit_message: `${session ? "Update" : "Create"} ${bundle.draft.title}`,
          pr_title: targetSession.title,
          pr_body: targetSession.body ?? config.publishing.prBody,
        },
        targetSession,
      );
      if (
        !result.commit_sha ||
        result.branch !== targetSession.branch ||
        result.pr_number !== targetSession.number
      )
        throw new Error(
          "The broker did not confirm the expected PR and commit.",
        );
      attempt.result = result;
    } catch (error) {
      attempt.uncertain = !error.status || error.status >= 500;
      attempt.requested = Boolean(attempt.draftSession) || attempt.uncertain;
      throw error;
    }
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
      "The PR no longer matches the confirmed save. Refresh the session to see its current state.",
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
    commitSha,
    files: entries.map(([path]) => ({ path })),
    documents,
  };
}
