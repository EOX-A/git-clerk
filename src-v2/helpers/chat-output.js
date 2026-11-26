import slugify from "slugify";
import { matchesFilePath } from "./file-editor.js";

export function chatDraftIdentity(...titles) {
  const title = titles
    .filter((value) => typeof value === "string")
    .map((value) =>
      value
        .trim()
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<!--[\s\S]*$/g, " ")
        .replace(/<[^>]*>/g, " ")
        .trim()
        .split(/\r?\n/, 1)[0]
        .replace(/^#{1,6}\s+/, "")
        .replace(/^["'`*“‘]+|["'`*”’]+$/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 100)
        .trim(),
    )
    .find(Boolean);
  if (!title) return null;
  const slug =
    slugify(title, { lower: true, strict: true })
      .replace(/-+/g, "-")
      .slice(0, 100)
      .replace(/^-|-$/g, "") || "draft";
  return { title, id: `${slug}-${crypto.randomUUID().slice(0, 8)}` };
}

export function chatOutputPath(template, draft, id = draft?.id) {
  if (!template) return null;
  const path = template.replace(/^\//, "");
  if (!path.includes("<id>")) return path;
  const resolved =
    typeof id === "string" &&
    id === id.trim() &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
      ? path.replaceAll("<id>", id)
      : null;
  const existing = Object.keys(draft?.files || {}).filter((file) =>
    matchesFilePath(file, path),
  );
  // Use the exact draft file first, or keep the one already in this PR.
  if (existing.includes(resolved)) return resolved;
  if (existing.length === 1) return existing[0];
  if (existing.length > 1)
    throw new Error(
      "More than one file in this session matches the chat output path. Edit the intended file directly.",
    );
  return resolved;
}

export function chatPrTitle(template, draft, username) {
  const render = (title) =>
    template.replace(
      /<(title|username|id)>/g,
      (_, key) => ({ title, username, id: draft.id })[key] ?? "",
    );
  // Leave room for the configured prefix and username within the PR limit.
  const titleCount = template.split("<title>").length - 1;
  const available = Math.max(
    0,
    Math.floor((256 - render("").length) / (titleCount || 1)),
  );
  return render(draft.title.trim().slice(0, available).trim()).trim();
}
