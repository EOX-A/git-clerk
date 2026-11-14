export default function sessionError(error) {
  if (error.code === "GITHUB_CONFIG_MISSING") {
    return "Connect a GitHub account and configure a repository to load sessions.";
  }
  if (error.code === "GITHUB_CONFIG_INVALID") {
    return "Set the GitHub repository as owner/repository.";
  }
  if (error.status === 401)
    return "GitHub authentication expired. Reconnect and retry.";
  if (error.status === 403 || error.status === 429) {
    return "GitHub denied the request or its rate limit was reached. Check access and retry later.";
  }
  if (error.status === 404)
    return "The repository or session is unavailable to this account.";
  return "Could not load sessions from GitHub. Please try again.";
}
