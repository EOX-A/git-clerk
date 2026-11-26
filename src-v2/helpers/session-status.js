export const SESSION_STATUS = {
  draft: { label: "Drafts", icon: "pr-draft", color: "text-draft" },
  open: { label: "Under review", icon: "pr-open", color: "text-open" },
  merged: { label: "Published", icon: "merge", color: "text-merged" },
  closed: { label: "Closed", icon: "pr-closed", color: "text-closed" },
};

export function sessionTag(session) {
  return session.status;
}
