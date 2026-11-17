import { exampleSchemaMap } from "./example-chat-config.js";
import assert from "node:assert/strict";
import test from "node:test";
import { Base64 } from "js-base64";
import {
  fileContent,
  saveFileContent,
  fileDiff,
} from "../src2/api/file-content.js";
import {
  fileConfiguration,
  formValue,
  formText,
  initialFileMode,
  toggleFileMode,
  parseDiff,
  previewAddress,
  sourceTokens,
} from "../src2/helpers/file-editor.js";

function fixture(overrides = {}) {
  const calls = [];
  const node = {
    id: "PR_7",
    number: 7,
    title: "Test",
    url: "https://github.com/target/repo/pull/7",
    state: "OPEN",
    isDraft: true,
    author: { login: "alice" },
    headRepositoryOwner: { login: "alice" },
    headRefName: "branch",
    headRefOid: "head",
    baseRefOid: "base",
    headRef: { id: "ref" },
    headRepository: {
      name: "fork",
      owner: { login: "alice" },
      viewerPermission: "WRITE",
      defaultBranchRef: { name: "main" },
    },
    viewerCanUpdate: true,
    ...overrides,
  };
  const context = {
    githubConfig: { username: "target", repo: "repo" },
    githubUserData: { login: "alice" },
    scopeOwners: ["alice"],
    octokit: {
      graphql: async () => ({ repository: { pullRequest: node } }),
      rest: {
        repos: {
          getContent: async (params) => {
            calls.push(params);
            return {
              data: {
                type: "file",
                path: params.path,
                encoding: "base64",
                size: 8,
                sha: "blob",
                content: Base64.encode("héllo 🌏\n"),
              },
            };
          },
          createOrUpdateFileContents: async (params) => {
            calls.push(params);
            return {
              data: {
                content: { sha: "new-blob" },
                commit: { sha: "new-head" },
              },
            };
          },
        },
      },
    },
  };
  const session = {
    number: 7,
    headOwner: "alice",
    headRepo: "fork",
    headSha: "head",
    branch: "branch",
  };
  return { context, session, calls };
}

test("preview defaults and deselection keep a usable source fallback", () => {
  assert.equal(initialFileMode(null), "source");
  assert.equal(initialFileMode("https://preview.test"), "none");
  assert.equal(toggleFileMode("source", "source", true), "none");
  assert.equal(toggleFileMode("editor", "source", true), "source");
  assert.equal(toggleFileMode("editor", "editor", false), "editor");
});
test("runtime schema matching, output fields and preview URLs follow v1 config", () => {
  const root = {
    gitClerkConfig: {
      schemaMap: [
        {
          path: "/products/<id>/collection.json",
          schema: { type: "object" },
          preview: "/preview.html",
        },
      ],
      customEditorInterfaces: { test: { format: "test" } },
    },
  };
  const config = fileConfiguration("products/a/collection.json", root);
  assert.equal(config.meta.preview, "/preview.html");
  config.meta.schema.type = "string";
  assert.equal(root.gitClerkConfig.schemaMap[0].schema.type, "object");
  assert.equal(fileConfiguration("README.md", root).meta, null);
  assert.deepEqual(formValue("# hello", { output: "body" }), {
    body: "# hello",
  });
  assert.equal(
    formText({ body: "# edited" }, { output: "body" }, "# hello"),
    "# edited",
  );
  assert.equal(formText({ id: 1 }, {}, '{ "id": 1 }'), '{ "id": 1 }');
  assert.throws(() => formValue("{", {}));
  assert.equal(
    previewAddress("/preview.html", "https://app.test/7"),
    "https://app.test/preview.html",
  );
  assert.equal(previewAddress("javascript:alert(1)", "https://app.test"), null);
});
test("file reads use actual head repository and immutable SHA, decode UTF-8", async () => {
  const { context, session, calls } = fixture();
  assert.equal(
    (await fileContent(context, session, "file.json")).text,
    "héllo 🌏\n",
  );
  assert.equal(calls[0].owner, "alice");
  assert.equal(calls[0].repo, "fork");
  assert.equal(calls[0].ref, "head");
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    fileContent(context, session, "file.json", abort.signal),
    { name: "AbortError" },
  );
  assert.equal(calls.length, 1);
});
test("binary and oversized files are never exposed as editable text", async () => {
  const { context, session } = fixture();
  for (const data of [
    { size: 3, encoding: "base64", content: Base64.encode("a\0b") },
    { size: 1024 * 1024 + 1, encoding: "none", content: "" },
  ]) {
    context.octokit.rest.repos.getContent = async () => ({
      data: { type: "file", ...data },
    });
    const file = await fileContent(context, session, "file");
    assert.equal(file.text, null);
    assert.ok(file.unavailable);
  }
});
test("missing fork content falls back to the target's same commit", async () => {
  const { context, session, calls } = fixture();
  const read = context.octokit.rest.repos.getContent;
  context.octokit.rest.repos.getContent = async (params) => {
    if (params.owner === "alice")
      throw Object.assign(new Error(), { status: 404 });
    return read(params);
  };
  await fileContent(context, session, "file");
  assert.equal(calls[0].owner, "target");
  assert.equal(calls[0].ref, "head");
});
test("saving uses original blob SHA, UTF-8 base64 and actual fork branch", async () => {
  const { context, session, calls } = fixture();
  assert.deepEqual(
    await saveFileContent(context, session, "file", "héllo 🌏", "blob"),
    { sha: "new-blob", commitSha: "new-head" },
  );
  assert.equal(calls[0].sha, "blob");
  assert.equal(calls[0].owner, "alice");
  assert.equal(calls[0].branch, "branch");
  assert.equal(Base64.decode(calls[0].content), "héllo 🌏");
});
test("saving refuses closed, merged, missing, unwritable and retargeted heads", async () => {
  for (const overrides of [
    { state: "CLOSED" },
    { state: "MERGED" },
    { headRef: null },
    { viewerCanUpdate: false },
    {
      headRepository: {
        name: "fork",
        owner: { login: "alice" },
        viewerPermission: "READ",
      },
    },
    { headRefName: "different" },
  ]) {
    const { context, session, calls } = fixture(overrides);
    await assert.rejects(
      saveFileContent(context, session, "file", "edit", "blob"),
      { status: 403 },
    );
    assert.equal(calls.length, 0);
  }
});
test("GitHub conflicts propagate instead of reporting a successful save", async () => {
  const { context, session } = fixture();
  context.octokit.rest.repos.createOrUpdateFileContents = async () => {
    throw Object.assign(new Error("conflict"), { status: 409 });
  };
  await assert.rejects(
    saveFileContent(context, session, "file", "edit", "old-sha"),
    { status: 409 },
  );
});
test("explicit diff loading paginates and distinguishes unavailable from unchanged", async () => {
  const { context, session } = fixture();
  context.octokit.rest.pulls = {
    listFiles: async ({ page }) =>
      page === 1
        ? { data: [], headers: { link: '<url>; rel="next"' } }
        : {
            data: [{ filename: "file", additions: 2, deletions: 1 }],
            headers: {},
          },
  };
  assert.equal((await fileDiff(context, session, "file")).patch, null);
  assert.equal((await fileDiff(context, session, "unchanged")).patch, "");
  const rows = parseDiff("@@ -3,2 +3,2 @@\n same\n-old\n+new");
  assert.equal(rows[1].oldLine, 3);
  assert.equal(rows[2].oldLine, 4);
  assert.equal(rows[3].newLine, 4);
});
test("source highlighting preserves text and treats markup as text", () => {
  const source = '<script>alert("hi")</script>\n';
  assert.equal(
    sourceTokens(source, "file.js")
      .map((token) => token.text)
      .join(""),
    source + "\n",
  );
});

test("OSC example config supplies parent and child schemas without application defaults", () => {
  const dirs = {
    products: "collection.json",
    projects: "collection.json",
    variables: "catalog.json",
    themes: "catalog.json",
    "eo-missions": "catalog.json",
  };
  const config = {
    gitClerkConfig: {
      schemaMap: structuredClone(exampleSchemaMap),
    },
  };
  for (const [dir, file] of Object.entries(dirs)) {
    const child = fileConfiguration(
      `${dir}/antarctic-ice-sheet-surface-flow-velocity-mos/${file}`,
      config,
    );
    assert.equal(
      child.meta.url,
      `https://esa-earthcode.github.io/open-science-catalog-validation/schemas/${dir}/children.json`,
    );
    assert.equal(
      fileConfiguration(`${dir}/catalog.json`, config).meta.url,
      `https://esa-earthcode.github.io/open-science-catalog-validation/schemas/${dir}/parent.json`,
    );
  }
  for (const path of [
    "products/a/catalog.json",
    "variables/a/collection.json",
    "products/a/b/collection.json",
    "products/catalogXjson",
    "unknown/a/catalog.json",
    "README.md",
  ])
    assert.equal(fileConfiguration(path, config).meta, null);
  assert.equal(config.gitClerkConfig.schemaMap.length, exampleSchemaMap.length);
  for (const id of ["Sentinel-1", "CryoSat-2", "Snow cover"])
    assert.equal(
      fileConfiguration(`eo-missions/${id}/catalog.json`, config).meta.url,
      "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/eo-missions/children.json",
    );
});

test("legacy global schemas override top-level config without mutation", () => {
  const meta = {
    path: "/products/<id>/collection.json",
    schema: { type: "object", required: ["custom"] },
    preview: "https://preview.example/",
  };
  const root = {
    schemaMap: [meta],
    gitClerkConfig: { schemaMap: structuredClone(exampleSchemaMap) },
  };
  const result = fileConfiguration("products/demo/collection.json", root);
  assert.equal(result.meta.url, undefined);
  assert.equal(result.meta.preview, meta.preview);
  result.meta.schema.required.push("edited");
  assert.deepEqual(meta.schema.required, ["custom"]);
  const other = fileConfiguration("products/demo/collection.json", {
    gitClerkConfig: {
      schemaMap: [
        { path: meta.path, url: "https://schemas.example/product.json" },
      ],
    },
  });
  assert.equal(other.meta.url, "https://schemas.example/product.json");
});

test("chat presets cannot change editor schemas or previews", () => {
  const meta = {
    path: "/docs/<name>.md",
    schema: { type: "object" },
    preview: "/preview.html",
  };
  const root = {
    gitClerkConfig: {
      schemaMap: [meta],
      chat: {
        preset: { schemaMap: [{ path: meta.path, preview: "/wrong.html" }] },
      },
    },
  };
  assert.equal(
    fileConfiguration("docs/guide.md", root).meta.preview,
    "/preview.html",
  );
  root.gitClerkConfig.chat.preset = { projectId: "different-project" };
  assert.equal(
    fileConfiguration("docs/guide.md", root).meta.preview,
    "/preview.html",
  );
  delete root.gitClerkConfig.schemaMap;
  root.gitClerkConfig.chat.preset.schemaMap = [meta];
  assert.equal(fileConfiguration("docs/guide.md", root).meta, null);
});
