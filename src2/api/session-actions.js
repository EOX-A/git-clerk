import { sessionDetails } from "./session.js";
import { canSubmitSession } from "../helpers/session-checks.js";

export async function updateSession(context, number, action, title = "") {
  // Recheck scope, state and permissions immediately before a write.
  const session = await sessionDetails(context, number);
  const { octokit, githubConfig } = context;
  const target = {
    owner: githubConfig.username,
    repo: githubConfig.repo,
    pull_number: number,
  };
  if (!session.canManage) throw new Error("Session cannot be changed.");
  if (action === "rename") {
    if (!title.trim() || title.trim().length > 256)
      throw new Error("Invalid session title.");
    await octokit.rest.pulls.update({ ...target, title: title.trim() });
  } else if (action === "review") {
    if (!canSubmitSession(session))
      throw new Error("Session is not ready for review.");
    await octokit.graphql(
      `mutation($pullRequestId: ID!) {
        markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
          pullRequest { id }
        }
      }`,
      { pullRequestId: session.id },
    );
  } else if (action === "delete") {
    if (!session.canDelete)
      throw new Error("Session branch cannot be deleted.");
    await octokit.rest.pulls.update({ ...target, state: "closed" });
    if (session.headRefID) {
      try {
        // Use the actual PR head repository, not the configured target repository.
        await octokit.rest.git.deleteRef({
          owner: session.headOwner,
          repo: session.headRepo,
          ref: `heads/${session.branch}`,
        });
      } catch {
        const error = new Error(
          "The PR was closed, but its branch could not be deleted.",
        );
        error.code = "SESSION_BRANCH_DELETE_FAILED";
        throw error;
      }
    }
  } else throw new Error("Unknown session action.");
}
