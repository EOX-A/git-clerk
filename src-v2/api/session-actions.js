import { sessionDetails } from "./session.js";
import { canSubmitSession } from "../helpers/session-checks.js";

export async function updateSession(context, number, action, value = "") {
  const session = await sessionDetails(context, number);
  const path = `/pulls/${number}`;
  if (!session.canManage) throw new Error("Session cannot be changed.");
  if (action === "rename") {
    const title = typeof value === "string" ? value : (value?.title ?? "");
    if (!title.trim() || title.trim().length > 256)
      throw new Error("Invalid session title.");
    await context.request(`${path}/rename`, {
      method: "PATCH",
      body: { title: title.trim() },
    });
  } else if (action === "review") {
    if (!canSubmitSession(session))
      throw new Error("Session is not ready for review.");
    const rawMessage =
      typeof value === "string"
        ? value
        : (value?.message ?? value?.body ?? "");
    const message = rawMessage.trim();
    const fallbackBody = !session.body?.trim()
      ? [
          "## Summary",
          "",
          `Session **${session.title}** submitted for review in Git Clerk.`,
          "",
          "## Notes",
          "",
          "- Review the proposed changes before merging.",
        ].join("\n")
      : undefined;
    const body = message || fallbackBody;
    await context.request(`${path}/submit`, {
      method: "POST",
      body: body ? { body } : {},
    });
  } else if (action === "delete") {
    if (!session.canDelete)
      throw new Error("Session branch cannot be deleted.");
    await context.request(path, {
      method: "DELETE",
      query: { delete_branch: true },
    });
  } else if (action === "close" || action === "reopen") {
    await context.request(`${path}/state`, {
      method: "PATCH",
      body: { state: action === "close" ? "closed" : "open" },
    });
  } else throw new Error("Unknown session action.");
}
