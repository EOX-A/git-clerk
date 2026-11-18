import assert from "node:assert/strict";
import test from "node:test";
import {
  changedFileTabs,
  closeFileTab,
} from "../src2/helpers/file-workspace.js";

test("changed paths open as tabs except for the draft session marker", () => {
  const tabs = changedFileTabs([
    { path: ".gitclerk-session", status: "added" },
    { path: "a", status: "added" },
    { path: "b", status: "removed" },
    { path: "c", status: "renamed" },
  ]);
  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(changedFileTabs([{ path: ".gitclerk-session" }]), []);
  assert.deepEqual(closeFileTab(tabs, "b", "b"), {
    tabs: [tabs[0], tabs[2]],
    activeID: "c",
  });
  assert.equal(closeFileTab(tabs, "c", "c").activeID, "b");
  assert.equal(closeFileTab(tabs, "a", "b").activeID, "a");
  assert.deepEqual(closeFileTab([tabs[0]], "a", "a"), {
    tabs: [],
    activeID: null,
  });
  assert.deepEqual(closeFileTab(tabs, "b", "unknown"), { tabs, activeID: "b" });
});

test("the first full schema path match opens first and other tabs keep their order", () => {
  const root = {
    gitClerkConfig: {
      schemaMap: [
        { path: "/products/<id>/collection.json", url: "/product-schema.json" },
        { path: "/stories/<name>.md", schema: { type: "object" } },
      ],
    },
  };
  const paths = [
    "README.md",
    "projects/demo/collection.json",
    "products/demo/notes.json",
    "products/demo/collection.json",
    "stories/demo.md",
  ];
  const tabs = changedFileTabs(
    paths.map((path) => ({ path })),
    root,
  );
  assert.deepEqual(
    tabs.map(({ path }) => path),
    [paths[3], ...paths.slice(0, 3), paths[4]],
  );
});
