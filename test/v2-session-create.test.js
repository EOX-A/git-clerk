import assert from "node:assert/strict";
import test from "node:test";
import { createPersonalSession } from "../src2/api/session-create.js";

function fixture() {
  const calls = [];
  const branches = new Map([["alice:main", "base"]]);
  const prs = [];
  const upstream = {
    id: 1,
    name: "catalog",
    owner: { login: "upstream" },
    default_branch: "main",
  };
  const fork = {
    id: 2,
    name: "catalog",
    owner: { login: "alice" },
    default_branch: "main",
    fork: true,
    parent: { id: 1 },
    permissions: { push: true },
  };
  const rest = {
    repos: {
      get: async (params) => {
        calls.push(["repo", params]);
        return { data: params.owner === "upstream" ? upstream : fork };
      },
      createFork: async (params) => {
        calls.push(["fork", params]);
        return { data: fork };
      },
      compareCommits: async (params) => {
        calls.push(["compare", params]);
        return { data: { status: "ahead" } };
      },
    },
    git: {
      getRef: async (params) => {
        calls.push(["ref", params]);
        const sha =
          params.owner === "upstream"
            ? "base"
            : branches.get(`${params.owner}:${params.ref.slice(6)}`);
        if (!sha) throw Object.assign(new Error("missing"), { status: 404 });
        return { data: { object: { sha } } };
      },
      getCommit: async (params) => {
        calls.push(["commit", params]);
        return { data: { tree: { sha: "tree" } } };
      },
      createCommit: async (params) => {
        calls.push(["createCommit", params]);
        return { data: { sha: "initial" } };
      },
      createRef: async (params) => {
        calls.push(["createRef", params]);
        branches.set(`${params.owner}:${params.ref.slice(11)}`, params.sha);
        return {};
      },
      updateRef: async (params) => {
        calls.push(["updateRef", params]);
        return {};
      },
    },
    pulls: {
      list: async (params) => {
        calls.push(["list", params]);
        return { data: prs };
      },
      create: async (params) => {
        calls.push(["pr", params]);
        const pr = {
          node_id: "PR_7",
          number: 7,
          title: params.title,
          html_url: "https://github.com/upstream/catalog/pull/7",
          draft: true,
          state: "open",
          updated_at: "today",
          head: {
            ref: params.head.split(":")[1],
            repo: { owner: { login: "alice" } },
          },
        };
        prs.push(pr);
        return { data: pr };
      },
    },
  };
  const context = {
    octokit: { rest },
    githubConfig: { username: "upstream", repo: "catalog" },
    githubUserData: { login: "alice" },
  };
  return { context, calls, branches, prs, fork, rest };
}

test("manual creation uses only the personal fork, empty commit, and upstream draft PR", async () => {
  const { context, calls } = fixture();
  const result = await createPersonalSession(context, "  New Session  ");
  assert.equal(result.number, 7);
  assert.equal(result.title, "New Session");
  assert.equal(result.status, "draft");
  assert.deepEqual(calls.find(([type]) => type === "createCommit")[1], {
    owner: "alice",
    repo: "catalog",
    message: "chore: create session using empty commit",
    tree: "tree",
    parents: ["base"],
  });
  assert.deepEqual(calls.find(([type]) => type === "createRef")[1], {
    owner: "alice",
    repo: "catalog",
    ref: "refs/heads/alice/new-session",
    sha: "initial",
  });
  assert.deepEqual(calls.find(([type]) => type === "pr")[1], {
    owner: "upstream",
    repo: "catalog",
    title: "New Session",
    head: "alice:alice/new-session",
    base: "main",
    draft: true,
  });
  assert.ok(!calls.some(([type]) => type === "updateRef"));
});

test("a missing personal fork is created without an organization and polled", async () => {
  const { context, calls, rest } = fixture();
  const get = rest.repos.get;
  let misses = 2;
  const waits = [];
  rest.repos.get = async (params) => {
    if (params.owner === "alice" && misses-- > 0)
      throw Object.assign(new Error(), { status: 404 });
    return get(params);
  };
  await createPersonalSession(
    context,
    "Session",
    {},
    () => {},
    async (ms) => waits.push(ms),
  );
  assert.deepEqual(calls.find(([type]) => type === "fork")[1], {
    owner: "upstream",
    repo: "catalog",
  });
  assert.deepEqual(waits, [5000, 5000]);
});

test("unrelated same-name repositories and unwritable forks cannot receive commits", async () => {
  for (const overrides of [
    { parent: { id: 99 } },
    { permissions: { push: false } },
    { owner: { login: "other" } },
  ]) {
    const { context, calls, fork } = fixture();
    Object.assign(fork, overrides);
    await assert.rejects(createPersonalSession(context, "Session"));
    assert.ok(
      !calls.some(([type]) =>
        ["createCommit", "createRef", "pr", "updateRef"].includes(type),
      ),
    );
  }
});

test("fork sync only fast-forwards and never overwrites divergent work", async () => {
  const { context, calls, branches, rest } = fixture();
  branches.set("alice:main", "older");
  await createPersonalSession(context, "Session");
  assert.deepEqual(calls.find(([type]) => type === "updateRef")[1], {
    owner: "alice",
    repo: "catalog",
    ref: "heads/main",
    sha: "base",
    force: false,
  });
  calls.length = 0;
  rest.repos.compareCommits = async () => ({ data: { status: "diverged" } });
  await assert.rejects(createPersonalSession(context, "Another"), {
    code: "SESSION_FORK_DIVERGED",
  });
  assert.ok(
    !calls.some(([type]) =>
      ["updateRef", "createCommit", "createRef", "pr"].includes(type),
    ),
  );
});

test("existing session branches get a safe suffix without changing or deleting them", async () => {
  const { context, branches, calls } = fixture();
  branches.set("alice:alice/session", "other-commit");
  await createPersonalSession(context, "Session");
  assert.equal(
    calls.find(([type]) => type === "createRef")[1].ref,
    "refs/heads/alice/session-2",
  );
  assert.equal(branches.get("alice:alice/session"), "other-commit");
});

test("retry after a lost PR response discovers the existing PR without duplication", async () => {
  const { context, rest, calls } = fixture();
  const attempt = {};
  const create = rest.pulls.create;
  rest.pulls.create = async (params) => {
    await create(params);
    throw new Error("response lost");
  };
  await assert.rejects(createPersonalSession(context, "Session", attempt));
  const result = await createPersonalSession(context, "Session", attempt);
  assert.equal(result.number, 7);
  assert.equal(calls.filter(([type]) => type === "pr").length, 1);
  assert.equal(calls.filter(([type]) => type === "createCommit").length, 1);
  assert.equal(calls.filter(([type]) => type === "createRef").length, 1);
});

test("retry reconciles a lost branch response and rejects changed titles", async () => {
  const { context, rest, calls } = fixture();
  const create = rest.git.createRef;
  rest.git.createRef = async (params) => {
    await create(params);
    throw new Error("response lost");
  };
  assert.equal((await createPersonalSession(context, "Session")).number, 7);
  assert.equal(calls.filter(([type]) => type === "createRef").length, 1);
  await assert.rejects(
    createPersonalSession(context, "Renamed", { title: "Original" }),
    { code: "SESSION_CREATION_STARTED" },
  );
});

test("blank names are rejected before requests and punctuation-only names have valid branches", async () => {
  const { context, calls } = fixture();
  await assert.rejects(createPersonalSession(context, "   "), {
    code: "SESSION_NAME_INVALID",
  });
  assert.equal(calls.length, 0);
  await createPersonalSession(context, "🌍");
  assert.equal(
    calls.find(([type]) => type === "createRef")[1].ref,
    "refs/heads/alice/session",
  );
});
