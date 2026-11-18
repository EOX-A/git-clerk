import slugify from "slugify";
import { brokerBranchPrefix } from "./git-broker.js";
import { findSessionBranch, sessionDetails } from "./session.js";

function newSessionBranch(context, title) {
  const prefix = brokerBranchPrefix(context.user);
  if (!prefix)
    throw new Error("Set GITCLERK_USERNAME to create a session branch.");
  const slug =
    slugify(title, { lower: true, strict: true }).slice(0, 100) || "draft";
  return `${prefix}${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createSession(context, name, attempt, onProgress) {
  return createDraftSession(context, { title: name }, attempt, onProgress);
}

export async function createDraftSession(
  context,
  { title: name, body },
  attempt = {},
  onProgress = () => {},
) {
  const title = name.trim();
  if (!title || title.length > 256)
    throw new Error("Enter a session name between 1 and 256 characters.");
  if (attempt.title && attempt.title !== title)
    throw new Error(
      "Retry with the same session name to finish creating this session.",
    );
  if (attempt.number) return sessionDetails(context, attempt.number);
  if (attempt.uncertain) {
    onProgress("Checking whether the session was created…");
    const session = await findSessionBranch(context, attempt.branch);
    if (!session)
      throw new Error(
        "The broker has not confirmed creation. Check the repository before starting another session.",
      );
    return session;
  }
  attempt.branch ||= newSessionBranch(context, title);
  onProgress("Creating the session through the Git broker…");
  try {
    const result = await context.request("/pulls", {
      method: "POST",
      body: {
        title,
        head_branch: attempt.branch,
        base_branch: context.repository.default_branch,
        draft: true,
        ...(body ? { body } : {}),
      },
    });
    const number = result.number ?? result.pr_number;
    if (!Number.isInteger(number) || number < 1)
      throw new Error("The broker did not return a session number.");
    attempt.number = number;
  } catch (error) {
    if (!error.status || error.status >= 500) {
      attempt.title = title;
      attempt.uncertain = true;
    }
    throw error;
  }
  attempt.title = title;
  return sessionDetails(context, attempt.number);
}
