export default function getPrStatus(session) {
  let color = "green";
  let icon = "git-pull-request";
  let state = "draft";

  if (session.state === "open") {
    if (session.draft) {
      color = "grey";
      icon = "git-pull-request-draft";
      state = "draft";
    }
  } else {
    if (session.merged_at) {
      color = "violet";
      icon = "git-merge";
      state = "merged";
    } else {
      color = "red";
      icon = "git-pull-request-closed";
      state = "closed";
    }
  }

  return {
    color,
    icon,
    state,
  };
}
