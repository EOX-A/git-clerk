import assert from "node:assert/strict";
import test from "node:test";
import { sessionFiles, branchRoot, branchDirectory } from "../src2/api/file.js";
import {
  changedFileTabs,
  closeFileTab,
} from "../src2/helpers/file-workspace.js";

const session = {
  number: 7,
  changedFiles: 2,
  headOwner: "alice",
  headRepo: "fork",
  headSha: "head-sha",
};
const fixture = (rest) => ({
  githubConfig: { username: "target", repo: "catalog" },
  octokit: { rest },
});

test("changed files follow every page on the target PR and retain only metadata", async () => {
  const calls = [];
  const context = fixture({
    pulls: {
      listFiles: async (params) => {
        calls.push(params);
        return {
          data: [
            {
              filename: `folder/file-${params.page}.json`,
              previous_filename: params.page === 2 ? "old.json" : undefined,
              status: params.page === 2 ? "renamed" : "added",
              additions: 3,
              deletions: 1,
              patch: "do not retain content",
            },
          ],
          headers:
            params.page === 1
              ? {
                  link: '<https://api.github.com/repositories/1/pulls/7/files?page=2>; rel="next", <https://api.github.com/repositories/1/pulls/7/files?page=2>; rel="last"',
                }
              : {},
        };
      },
    },
  });
  const controller = new AbortController();
  const result = await sessionFiles(context, session, controller.signal);
  assert.equal(result.files.length, 2);
  assert.equal(result.incomplete, false);
  assert.equal(result.files[1].previousPath, "old.json");
  assert.ok(result.files.every((file) => !("patch" in file)));
  assert.deepEqual(
    calls.map(({ owner, repo, page }) => [owner, repo, page]),
    [
      ["target", "catalog", 1],
      ["target", "catalog", 2],
    ],
  );
  assert.equal(calls[0].request.signal, controller.signal);
  assert.equal(calls[0].per_page, 100);
});

test("a limited GitHub file response is marked incomplete, not an empty success", async () => {
  const context = fixture({
    pulls: { listFiles: async () => ({ data: [], headers: {} }) },
  });
  assert.equal((await sessionFiles(context, session)).incomplete, true);
  assert.equal(
    (await sessionFiles(context, { ...session, changedFiles: 0 })).incomplete,
    false,
  );
});

test("aborting a file request between pages prevents subsequent requests", async () => {
  const controller = new AbortController();
  let calls = 0;
  const context = fixture({
    pulls: {
      listFiles: async () => {
        calls++;
        controller.abort();
        return { data: [], headers: { link: '<url>; rel="next"' } };
      },
    },
  });
  await assert.rejects(sessionFiles(context, session, controller.signal), {
    name: "AbortError",
  });
  assert.equal(calls, 1);
  await assert.rejects(sessionFiles(context, session, controller.signal), {
    name: "AbortError",
  });
  assert.equal(calls, 1);
});

test("branch browsing resolves the actual fork's fixed head commit", async () => {
  const calls = [];
  const context = fixture({
    git: {
      getCommit: async (params) => {
        calls.push(params);
        return { data: { tree: { sha: "root-tree" } } };
      },
    },
  });
  assert.deepEqual(await branchRoot(context, session), {
    owner: "alice",
    repo: "fork",
    treeSha: "root-tree",
  });
  assert.equal(calls[0].commit_sha, "head-sha");
  assert.equal(calls[0].owner, "alice");
  assert.equal(calls[0].repo, "fork");
});

test("a deleted fork falls back to the same commit in the target, but other failures do not", async () => {
  const calls = [];
  const context = fixture({
    git: {
      getCommit: async (params) => {
        calls.push(params);
        if (params.owner === "alice")
          throw Object.assign(new Error("missing"), { status: 404 });
        return { data: { tree: { sha: "retained-tree" } } };
      },
    },
  });
  assert.deepEqual(await branchRoot(context, session), {
    owner: "target",
    repo: "catalog",
    treeSha: "retained-tree",
  });
  assert.ok(calls.every((call) => call.commit_sha === "head-sha"));
  let count = 0;
  context.octokit.rest.git.getCommit = async () => {
    count++;
    throw Object.assign(new Error("rate limited"), { status: 403 });
  };
  await assert.rejects(branchRoot(context, session), { status: 403 });
  assert.equal(count, 1);
});

test("directories load lazily with folders first and preserve nested paths and submodules", async () => {
  let params;
  const context = fixture({
    git: {
      getTree: async (input) => {
        params = input;
        return {
          data: {
            truncated: false,
            tree: [
              { path: "z.json", sha: "blob", type: "blob" },
              { path: "b", sha: "folder", type: "tree" },
              { path: "a", sha: "commit", type: "commit" },
            ],
          },
        };
      },
    },
  });
  const entries = await branchDirectory(
    context,
    { owner: "alice", repo: "fork" },
    "nested-tree",
    "products",
  );
  assert.deepEqual(
    entries.map((entry) => [entry.path, entry.type]),
    [
      ["products/b", "folder"],
      ["products/a", "submodule"],
      ["products/z.json", "file"],
    ],
  );
  assert.equal(params.tree_sha, "nested-tree");
  assert.equal(params.owner, "alice");
  assert.equal(params.recursive, undefined);
  context.octokit.rest.git.getTree = async () => ({
    data: { truncated: true, tree: [] },
  });
  await assert.rejects(
    branchDirectory(context, { owner: "alice", repo: "fork" }, "tree"),
    /incomplete/,
  );
});

test("all changed paths, including removed files, open as tabs without file views", () => {
  const tabs = changedFileTabs([
    { path: "a", status: "added" },
    { path: "b", status: "removed" },
    { path: "c", status: "renamed" },
  ]);
  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ["a", "b", "c"],
  );
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
