export async function sessionFiles(context, session, signal) {
  const result = await context.request(`/pulls/${session.number}/files`, {
    signal,
  });
  const files = result.files.map((file) => ({
    path: file.filename,
    previousPath: file.previous_filename || null,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
  }));
  return { files, incomplete: files.length < session.changedFiles };
}

export async function branchDirectory(context, session, path = "", signal) {
  const result = await context.request("/tree", {
    query: { path, ref: session.headSha || session.branch },
    signal,
  });
  return result.entries
    .map((entry) => ({
      ...entry,
      type: ["dir", "tree", "folder"].includes(entry.type)
        ? "folder"
        : entry.type,
    }))
    .sort(
      (a, b) =>
        Number(b.type === "folder") - Number(a.type === "folder") ||
        a.name.localeCompare(b.name),
    );
}
