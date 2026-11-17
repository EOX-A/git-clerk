import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  gitBlobSha,
  publishedFile,
  applyPublishedFile,
} from "../src2/helpers/file-publication.js";

test("published content uses Git's exact UTF-8 blob SHA for subsequent manual saves", async () => {
  for (const text of ["", "hello\n", '{"title":"Océan 🌊"}\n']) {
    const expected = createHash("sha1")
      .update(`blob ${Buffer.byteLength(text)}\0`)
      .update(text)
      .digest("hex");
    assert.equal(await gitBlobSha(text), expected);
  }
});
const session = {
  number: 7,
  headOwner: "alice",
  headRepo: "catalog",
  branch: "session/test",
  headSha: "saved",
};
const file = { text: '{"title":"Updated"}\n', sha: "new-blob" };
const publication = {
  session,
  documents: { "products/sample/collection.json": file },
};
test("publication reuse is restricted to the exact session, repository, branch and commit", () => {
  const path = "products/sample/collection.json";
  assert.equal(publishedFile(publication, session, path), file);
  for (const key of Object.keys(session))
    assert.equal(
      publishedFile(publication, { ...session, [key]: "different" }, path),
      null,
    );
  assert.equal(publishedFile(null, session, path), null);
  assert.equal(publishedFile(publication, session, "other.json"), null);
});
test("confirmed files update immediately without resetting editor mode, schema or preview", () => {
  const meta = { schema: { type: "object" } };
  const doc = {
    loaded: true,
    text: "old",
    savedText: "old",
    sha: "old-blob",
    headSha: "old-head",
    mode: "editor",
    preview: "https://preview.test",
    meta,
    remoteChanged: true,
    history: ["old"],
    historyIndex: 0,
  };
  assert.equal(applyPublishedFile(doc, file, "saved"), true);
  assert.equal(doc.text, file.text);
  assert.equal(doc.savedText, file.text);
  assert.equal(doc.sha, "new-blob");
  assert.equal(doc.headSha, "saved");
  assert.equal(doc.mode, "editor");
  assert.equal(doc.meta, meta);
  assert.equal(doc.preview, "https://preview.test");
  assert.equal(doc.remoteChanged, false);
  assert.deepEqual(doc.history, [file.text]);
});
test("publication cannot overwrite local edits, active saves or uninitialized documents", () => {
  for (const doc of [
    { loaded: true, text: "local edit", savedText: "old" },
    { loaded: true, text: "old", savedText: "old", saving: true },
    { loaded: false, text: "", savedText: "" },
  ]) {
    const before = structuredClone(doc);
    assert.equal(applyPublishedFile(doc, file, "saved"), false);
    assert.deepEqual(doc, before);
  }
});
