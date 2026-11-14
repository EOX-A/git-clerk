import { SESSION_STATUS } from "./session-status.js";

export const SESSION_SORT_OPTIONS = [
  { value: "recent", label: "Recent activity" },
  { value: "pr", label: "PR number" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
];

export const SESSION_GROUP_OPTIONS = [
  { value: "none", label: "None" },
  { value: "org", label: "Organization" },
  { value: "repo", label: "Repository" },
];

export function filterSessions(sessions, statuses, sort) {
  const ranks = Object.keys(SESSION_STATUS);
  const recent = (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  const compare = {
    recent,
    pr: (a, b) => b.number - a.number || recent(a, b),
    title: (a, b) => a.title.localeCompare(b.title) || recent(a, b),
    status: (a, b) =>
      ranks.indexOf(a.status) - ranks.indexOf(b.status) || recent(a, b),
  };
  return sessions
    .filter((session) => statuses.includes(session.status))
    .sort(compare[sort]);
}

export function groupSessions(sessions, group) {
  if (!sessions.length) return [];
  if (group === "none") return [{ id: "none", label: "", sessions }];
  const groups = new Map();
  for (const session of sessions) {
    const key =
      group === "org" ? session.owner : `${session.owner}/${session.repo}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: `${group}:${key}`,
        title: key,
        label: group === "org" ? session.owner : session.repo,
        sessions: [],
      });
    }
    groups.get(key).sessions.push(session);
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function sessionFilterSummary(statuses, sort, group) {
  const parts = [];
  if (statuses.length < Object.keys(SESSION_STATUS).length) {
    parts.push(
      statuses.length
        ? Object.keys(SESSION_STATUS)
            .filter((status) => statuses.includes(status))
            .map((status) => SESSION_STATUS[status].label)
            .join(", ")
        : "No statuses",
    );
  }
  if (sort !== "recent")
    parts.push(
      `By ${SESSION_SORT_OPTIONS.find((option) => option.value === sort).label.toLowerCase()}`,
    );
  if (group !== "none")
    parts.push(
      `Grouped by ${SESSION_GROUP_OPTIONS.find((option) => option.value === group).label.toLowerCase()}`,
    );
  return parts.join(" · ");
}
