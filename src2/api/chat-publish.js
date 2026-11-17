import { Base64 } from "js-base64";
import { checkDraftFiles } from "./draft-files.js";
import { publishGitBundle } from "./git-broker.js";
import { sessionDetails } from "./session.js";
import { gitBlobSha } from "../helpers/file-publication.js";
import { getChatConfig } from "../helpers/chat-config.js";

// Octokit reads context and verifies the result; all Git writes belong to the broker.
export async function publishChatFiles(
  context,
  bundle,
  attempt = {},
  session,
  publish = publishGitBundle,
  details = sessionDetails,
) {
  const config = getChatConfig();
  if (
    !config.publishing.enabled ||
    (session && !config.publishing.updateExistingSession)
  )
    throw new Error("Chat publishing is disabled for this operation.");
  const entries = checkDraftFiles(bundle);
  const { octokit, githubConfig, githubUserData: user } = context;
  const repo = { owner: githubConfig.username, repo: githubConfig.repo };
  const fullName = `${repo.owner}/${repo.repo}`;
  if (session) {
    if (!session.canEdit || !["open", "draft"].includes(session.status))
      throw new Error(
        "This session is read-only. Reopen it before saving AI edits.",
      );
    if (
      `${session.headOwner}/${session.headRepo}`.toLowerCase() !==
      fullName.toLowerCase()
    )
      throw new Error(
        "The Git broker can update PRs within the configured repository only. Use the file editor for this cross-fork PR.",
      );
    if (
      !Number.isSafeInteger(session.number) ||
      session.number < 1 ||
      !session.branch ||
      !session.baseBranch ||
      !session.headSha ||
      session.branch === session.baseBranch ||
      session.branch === context.githubTargetRepo?.default_branch
    )
      throw new Error(
        "Refresh the session to load a separate, existing PR branch before saving AI edits.",
      );
  }
  if (
    attempt.repo &&
    (attempt.repo !== fullName ||
      attempt.login !== user.login ||
      attempt.sessionNumber !== (session?.number || null) ||
      (session && attempt.branch !== session.branch))
  )
    throw new Error(
      "The publishing account, repository or session changed. Return to the original session to check this request.",
    );
  attempt.repo ||= fullName;
  attempt.login ||= user.login;
  attempt.sessionNumber ??= session?.number || null;
  attempt.previousHead ||= session?.headSha;
  attempt.branch ||=
    session?.branch || `session/${user.login}/${crypto.randomUUID()}`;
  // Reuse repository metadata loaded at sign-in; publication needs no preflight reads.
  attempt.baseBranch ||=
    session?.baseBranch || context.githubTargetRepo?.default_branch;
  if (!attempt.baseBranch || attempt.baseBranch === attempt.branch)
    throw new Error(
      "The repository has no usable default branch for publishing.",
    );

  const readBranch = async () => {
    try {
      const { data } = await octokit.rest.git.getRef({
        ...repo,
        ref: `heads/${attempt.branch}`,
      });
      return data.object.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
      return null;
    }
  };
  const readFile = async (path, ref) => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        ...repo,
        path,
        ref,
      });
      if (
        data.type !== "file" ||
        data.encoding !== "base64" ||
        data.size > 1024 * 1024
      )
        throw new Error(`${path}: cannot safely read existing content.`);
      return Base64.decode(data.content);
    } catch (error) {
      if (error.status !== 404) throw error;
      return null;
    }
  };

  if (!attempt.result && attempt.requested) {
    // Reconcile uncertain writes by reads only, including updates to an existing PR.
    const sha = await readBranch();
    if (!sha || sha === attempt.previousHead)
      throw new Error(
        "The previous publish request has no confirmed branch yet. Retry checking later; Git Clerk will not resend an uncertain publish request.",
      );
    for (const [path, text] of Object.entries(attempt.files))
      if ((await readFile(path, sha)) !== text)
        throw new Error(
          "The published branch differs from this draft. Inspect it on GitHub before continuing; no files were overwritten.",
        );
    const { data: prs } = await octokit.rest.pulls.list({
      ...repo,
      head: `${repo.owner}:${attempt.branch}`,
      base: attempt.baseBranch,
      state: "open",
      per_page: 100,
    });
    const pr = prs.find(
      (item) =>
        item.head.sha === sha &&
        item.head.repo?.full_name === fullName &&
        item.base.ref === attempt.baseBranch &&
        (!attempt.sessionNumber || item.number === attempt.sessionNumber),
    );
    if (!pr)
      throw new Error(
        "The broker created a branch but no matching open PR is confirmed. Check the broker logs; retry will only check the result, not overwrite the branch.",
      );
    attempt.result = { pr_number: pr.number, commit_sha: sha };
  }

  if (!attempt.result) {
    const files = Object.create(null);
    const documents = Object.create(null);
    const changed = [];
    for (const [path, generated] of entries) {
      files[path] =
        typeof generated === "string"
          ? generated
          : JSON.stringify(generated, null, 2) + "\n";
      documents[path] = {
        text: files[path],
        sha: await gitBlobSha(files[path]),
      };
      changed.push({ path, status: "Saved" });
    }
    const auth = await octokit.auth();
    if (!auth.token)
      throw new Error(
        "Connect GitHub before publishing through the Git broker.",
      );
    attempt.files = files;
    attempt.documents = documents;
    attempt.changed = changed;
    attempt.requested = true;
    attempt.result = await publish({
      repo: fullName,
      // This broker uses base_branch for both commit ancestry and PR creation.
      // Starting from the current head preserves its tree/history; its 422 fallback
      // finds the existing open PR without changing that PR's actual base branch.
      baseBranch: session ? attempt.branch : attempt.baseBranch,
      targetBranch: attempt.branch,
      title: bundle.draft.title,
      ...(session
        ? {
            existingPrNumber: session.number,
            prTitle: session.title,
            prBody: session.body || "",
          }
        : {}),
      files,
      token: auth.token,
    });
  }
  const published = await details(context, attempt.result.pr_number);
  if (
    published.headOwner !== repo.owner ||
    published.headRepo !== repo.repo ||
    published.branch !== attempt.branch ||
    published.headSha !== attempt.result.commit_sha ||
    (attempt.sessionNumber &&
      (published.number !== attempt.sessionNumber ||
        published.baseBranch !== attempt.baseBranch))
  )
    throw new Error(
      "The returned PR no longer matches the published branch. Inspect it on GitHub before continuing.",
    );
  return {
    session: published,
    commitSha: attempt.result.commit_sha,
    files: attempt.changed,
    documents: attempt.documents,
  };
}
