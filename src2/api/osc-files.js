const fail = (message) =>
  Object.assign(new Error(message), { code: "OSC_SAVE" });
const canonicalLink = (path, link) =>
  `${link.rel}:${new URL(link.href, `https://catalog.local/${path}`).href}`;

export function mergeOscFile(
  path,
  current,
  generated,
  replaceMetadata = false,
) {
  if (!current) return generated;
  const merged = replaceMetadata
    ? { ...current, ...generated }
    : { ...current };
  const links = new Map(
    (current.links || []).map((link) => [canonicalLink(path, link), link]),
  );
  for (const link of generated.links || []) {
    const key = canonicalLink(path, link);
    // Preserve existing link metadata, including titles and media types.
    if (!links.has(key)) links.set(key, link);
  }
  merged.links = [...links.values()];
  return merged;
}

export function checkOscFiles(bundle) {
  const files = bundle.staged_files;
  if (!files || typeof files !== "object" || Array.isArray(files))
    throw fail("The response did not include a file map to publish.");
  const entries = Object.entries(files);
  if (!entries.length) throw fail("The response contains no files to publish.");
  for (const [path] of entries) {
    // Only enforce repository-relative addressing. OSC naming/content rules
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
