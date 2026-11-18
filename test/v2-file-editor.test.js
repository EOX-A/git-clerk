import { exampleSchemaMap } from "./example-chat-config.js";
import assert from "node:assert/strict";
import test from "node:test";
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
