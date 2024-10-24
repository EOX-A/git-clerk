export default function getFileChangesStatus(status) {
  let color = "green";
  let icon = "git-added";

  switch (status) {
    case "added":
      color = "#35A16E";
      icon = "diff-added";
      break;
    case "modified":
      color = "#9A6700";
      icon = "diff-modified";
      break;
    case "removed":
      color = "#E40B37";
      icon = "diff-removed";
      break;
    case "renamed":
      color = "#838a8d";
      icon = "diff-renamed";
      break;
    case "ignored":
      color = "#838a8d";
      icon = "diff-ignored";
      break;
  }

  return {
    color,
    icon,
    status,
  };
}
