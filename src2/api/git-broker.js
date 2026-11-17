// Publishing goes through the existing agentic gateway, never directly to the MCP server.
export async function publishGitBundle({
  repo,
  baseBranch,
  targetBranch,
  title,
  prTitle = title,
  prBody = "OSC metadata generated in Git Clerk. Schema validation has not been performed.",
  existingPrNumber,
  files,
  author,
  token,
  dryRun = false,
}) {
  const updating =
    Number.isSafeInteger(existingPrNumber) && existingPrNumber > 0;
  if (
    !repo ||
    !baseBranch ||
    !targetBranch ||
    (updating ? targetBranch !== baseBranch : targetBranch === baseBranch) ||
    (existingPrNumber !== undefined && !updating)
  )
    throw new Error("Choose a separate session branch before publishing.");
  if (!dryRun && !token)
    throw new Error("Connect GitHub before publishing through the Git broker.");
  const baseURL = (
    import.meta.env?.GITCLERK_AGENTIC_API_URL || "http://localhost:8000"
  ).replace(/\/+$/, "");
  let response;
  try {
    response = await fetch(`${baseURL}/api/mcp/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Git-Token": token } : {}),
      },
      body: JSON.stringify({
        server_id: "eox-git-broker",
        tool_name: "git_publish_bundle",
        arguments: {
          repo,
          base_branch: baseBranch,
          target_branch: targetBranch,
          files,
          commit_message: title,
          pr_title: prTitle,
          // The broker substitutes a default description for an empty string.
          pr_body: prBody || "\n",
          author,
          provider: "github",
          dry_run: dryRun,
        },
      }),
    });
  } catch {
    throw new Error(
      "The Git broker connection failed. Check the session branch before retrying; publishing may have completed.",
    );
  }
  if (!response.ok)
    throw new Error(
      `Git broker publishing failed (HTTP ${response.status}). Check the session branch before retrying.`,
    );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The Git broker returned an unreadable response. Check the session branch before retrying.",
    );
  }
  if (result.status !== "published")
    throw new Error(
      "The Git broker did not confirm publication. Check its configuration and the session branch before retrying.",
    );
  if (!dryRun && result.mode !== "github_live")
    throw new Error(
      "The Git broker returned a simulation; no live PR was confirmed. Check its GitHub authentication.",
    );
  if (
    result.provider !== "github" ||
    result.repo !== repo ||
    result.branch !== targetBranch ||
    !/^[a-f0-9]{40}$/.test(result.commit_sha || "") ||
    !Number.isSafeInteger(result.pr_number) ||
    result.pr_number < 1 ||
    (updating && result.pr_number !== existingPrNumber) ||
    result.pr_url !== `https://github.com/${repo}/pull/${result.pr_number}`
  )
    throw new Error(
      "The Git broker response does not match the requested repository and branch. Check the session branch before retrying.",
    );
  return result;
}
