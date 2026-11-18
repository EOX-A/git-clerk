export default function sessionError(error) {
  if (error.code === "BROKER_REPO_UNAVAILABLE")
    return "The Git broker could not load the repository. Check the broker URL, version, and repository configuration.";
  if (error.status === 401)
    return "Your workspace session expired. Sign in again and retry.";
  if (error.status === 403 || error.status === 429) {
    return "The Git broker denied the request or reached a rate limit. Check access and retry later.";
  }
  if (error.status === 404)
    return "The repository or session is unavailable to this account.";
  return "Could not load sessions from the Git broker. Check the connection and retry.";
}
