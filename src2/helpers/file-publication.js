// Git hashes the UTF-8 blob header and contents, not just the text itself.
export async function gitBlobSha(text) {
  const content = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${content.length}\0`);
  const bytes = new Uint8Array(header.length + content.length);
  bytes.set(header);
  bytes.set(content, header.length);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

// Only reuse confirmed contents for this exact repository, session and commit.
export function publishedFile(publication, session, path) {
  const saved = publication?.session;
  if (
    !saved ||
    saved.number !== session.number ||
    saved.headOwner !== session.headOwner ||
    saved.headRepo !== session.headRepo ||
    saved.branch !== session.branch ||
    saved.headSha !== session.headSha
  )
    return null;
  return publication.documents?.[path] || null;
}

export function applyPublishedFile(doc, file, headSha) {
  if (!file || !doc?.loaded || doc.saving || doc.text !== doc.savedText)
    return false;
  Object.assign(doc, file, {
    savedText: file.text,
    headSha,
    loading: false,
    error: "",
    unavailable: "",
    removed: false,
    remoteChanged: false,
    saved: true,
    validation: [],
    history: [file.text],
    historyIndex: 0,
  });
  return true;
}
