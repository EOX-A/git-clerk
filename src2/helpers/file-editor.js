export function matchFileSchema(path, root = globalThis) {
  const config = root.gitClerkConfig || {};
  const schemas = root.schemaMap || config.schemaMap || [];
  return schemas.find((item) => {
    // Paths are literal except for single-segment <placeholders>.
    const pattern = item.path
      .split(/(<[^>]+>)/g)
      .map((part) =>
        /^<[^>]+>$/.test(part)
          ? "[^/]+"
          : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      )
      .join("");
    return new RegExp(`^${pattern}$`).test(`/${path}`);
  });
}

// Match v1's runtime schema/preview contracts without importing its application state.
export function fileConfiguration(path, root = globalThis) {
  const config = root.gitClerkConfig || {};
  const match = matchFileSchema(path, root);
  return {
    meta: match
      ? {
          ...match,
          schema: match.schema ? structuredClone(match.schema) : null,
        }
      : null,
    interfaces: Object.values(
      root.customEditorInterfaces || config.customEditorInterfaces || {},
    ),
    generateEnums: root.generateEnums || config.generateEnums,
  };
}
export function legacySession(session) {
  return {
    ...session,
    head: {
      sha: session.headSha,
      ref: session.branch,
      repo: { name: session.headRepo, owner: { login: session.headOwner } },
    },
    base: { repo: { name: session.repo, owner: { login: session.owner } } },
  };
}
export function formValue(text, meta) {
  if (meta?.output) return { [meta.output]: text };
  return JSON.parse(text);
}
export function formText(value, meta, original) {
  if (meta?.output)
    return typeof value[meta.output] === "string"
      ? value[meta.output]
      : JSON.stringify(value[meta.output], null, 2) + "\n";
  // Opening a form must not dirty a file just by reformatting unchanged JSON.
  try {
    if (JSON.stringify(JSON.parse(original)) === JSON.stringify(value))
      return original;
  } catch {
    /* Source may be invalid JSON until repaired. */
  }
  const indent = original.match(/\n([\t ]+)\S/)?.[1] || "  ";
  return (
    JSON.stringify(value, null, indent) + (original.endsWith("\n") ? "\n" : "")
  );
}
export function initialFileMode(preview) {
  return preview ? "none" : "source";
}
export function toggleFileMode(current, next, preview) {
  return current === next && preview ? "none" : next;
}
export function previewAddress(value, base) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function parseDiff(patch) {
  let oldLine = 0,
    newLine = 0;
  return patch.split("\n").map((text) => {
    const hunk = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      return { text, type: "hunk" };
    }
    if (text.startsWith("+")) return { text, type: "add", newLine: newLine++ };
    if (text.startsWith("-"))
      return { text, type: "delete", oldLine: oldLine++ };
    if (text.startsWith(" "))
      return { text, type: "context", oldLine: oldLine++, newLine: newLine++ };
    return { text, type: "note" };
  });
}
export function sourceTokens(text, path) {
  const json = /\.json$/i.test(path);
  const markdown = /\.(md|markdown)$/i.test(path);
  const pattern = json
    ? /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([{}[\],:])/g
    : markdown
      ? /(^#{1,6} .*$)|(\*\*[^*]+\*\*|`[^`]+`)|(^>.*$)/gm
      : /(\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(const|let|return|function|import|export|if|else|await|async|true|false|null)\b/g;
  const tokens = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > end)
      tokens.push({ text: text.slice(end, match.index), color: "text-text" });
    const color = json
      ? match[1]
        ? "text-syn-key"
        : match[2]
          ? "text-syn-str"
          : match[3]
            ? "text-syn-kw"
            : match[4]
              ? "text-syn-num"
              : "text-syn-punc"
      : match[1]
        ? "text-syn-key"
        : match[2]
          ? "text-syn-str"
          : "text-syn-kw";
    tokens.push({ text: match[0], color });
    end = match.index + match[0].length;
  }
  tokens.push({ text: text.slice(end) + "\n", color: "text-text" });
  return tokens;
}

export function fileRepositoryUrl(session, path, doc, changed) {
  const provider = session.provider || "github";
  if (doc?.diff || changed?.status === "removed")
    return session.url
      ? `${session.url}/${provider === "gitlab" ? "diffs" : "files"}`
      : null;
  if (!session.repositoryUrl) return session.url || null;
  const ref = encodeURIComponent(
    doc?.headSha || session.headSha || session.branch,
  );
  const file = path.split("/").map(encodeURIComponent).join("/");
  const route =
    { gitlab: `-/blob/${ref}`, forgejo: `src/commit/${ref}` }[provider] ||
    `blob/${ref}`;
  return `${session.repositoryUrl.replace(/\/$/, "")}/${route}/${file}`;
}
