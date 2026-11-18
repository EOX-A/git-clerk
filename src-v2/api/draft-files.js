const fail = (message) =>
  Object.assign(new Error(message), { code: "DRAFT_SAVE" });

export function checkDraftFiles(bundle) {
  const files = bundle.staged_files;
  if (!files || typeof files !== "object" || Array.isArray(files))
    throw fail("The response did not include a file map to publish.");
  const entries = Object.entries(files);
  if (!entries.length) throw fail("The response contains no files to publish.");
  for (const [path] of entries) {
    // Only enforce repository-relative addressing. Content and naming rules
    // belong to the backend; spaces, Unicode and nested directories are valid.
    if (
      path.includes("\0") ||
      path.includes("\\") ||
      path.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw fail(
        `Use a repository-relative file path without traversal segments: ${JSON.stringify(path)}.`,
      );
  }
  return entries;
}
