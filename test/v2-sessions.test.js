import assert from "node:assert/strict";
import test from "node:test";
import { initOctokit } from "../src2/api/github.js";
import { sessionsList, sessionDetails } from "../src2/api/session.js";
import sessionError from "../src2/helpers/session-error.js";

const githubConfig = { username: "target", repo: "catalog" };
const node = (number, owner, state = "OPEN", isDraft = false) => ({
  id: `PR_${number}`,
  number,
  title: `Session ${number}`,
  url: `https://github.com/target/catalog/pull/${number}`,
  state,
  isDraft,
  updatedAt: "2026-11-14T00:00:00Z",
  author: { login: "alice" },
  headRepositoryOwner: owner ? { login: owner } : null,
});
const context = (graphql, scopeOwners = ["alice"]) => ({
  octokit: { graphql },
  githubConfig,
  githubUserData: { login: "alice" },
  scopeOwners,
});
const page = (nodes, hasNextPage = false, endCursor = null) => ({
  repository: { pullRequests: { nodes, pageInfo: { hasNextPage, endCursor } } },
});

function mockGitHub(t, { permissions = {}, forks } = {}) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, method: options.method });
    let data;
    if (path === "/user") data = { login: "Alice", email: null };
    else if (path === "/repos/target/catalog") data = { permissions };
    else if (path === "/graphql") {
      const { variables } = JSON.parse(options.body);
      data = { data: { repository: { forks: forks(variables.after) } } };
    } else throw new Error(`Unexpected request: ${path}`);
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
    });
  });
  return requests;
}

test("missing or invalid config fails before contacting GitHub", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected network request");
  });
  await assert.rejects(initOctokit({}, {}), { code: "GITHUB_CONFIG_MISSING" });
  await assert.rejects(
    initOctokit({ githubAuthToken: "dummy", githubRepo: "invalid" }, {}),
    { code: "GITHUB_CONFIG_INVALID" },
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("async token provider and repo-writer scope use read-only initialization", async (t) => {
  const requests = mockGitHub(t, { permissions: { push: true } });
  const result = await initOctokit(
    {
      githubAuthToken: async () => "dummy-token",
      githubRepo: "target/catalog",
    },
    {},
    { personal: false, org: true },
  );
  assert.equal(result.scopeOwners, null);
  assert.equal(result.githubUserData.login, "Alice");
  assert.deepEqual(
    requests.map((r) => r.method),
    ["GET", "GET"],
  );
});

test("env fallback includes personal and writable affiliated org forks across pages", async (t) => {
  const fork = (login, name, permission, type = "Organization") => ({
    name,
    viewerPermission: permission,
    owner: { login, __typename: type },
  });
  mockGitHub(t, {
    forks: (after) =>
      after
        ? {
            nodes: [fork("Editors", "catalog", "MAINTAIN")],
            pageInfo: { hasNextPage: false, endCursor: null },
          }
        : {
            nodes: [
              fork("Team", "catalog", "WRITE"),
              fork("Readers", "catalog", "READ"),
              fork("Other", "other", "ADMIN"),
              fork("Bob", "catalog", "ADMIN", "User"),
            ],
            pageInfo: { hasNextPage: true, endCursor: "next" },
          },
  });
  const result = await initOctokit(
    {},
    {
      GITCLERK_GITHUB_TOKEN: "dummy-token",
      GITCLERK_GITHUB_REPO: "target/catalog",
    },
    { personal: true, org: true },
  );
  assert.deepEqual(result.scopeOwners, ["alice", "team", "editors"]);
});

test("scoped pagination skips unrelated pages and returns the next cursor", async () => {
  const calls = [];
  const result = await sessionsList(
    context(async (query, variables) => {
      calls.push(variables.after);
      return variables.after === null
        ? page([node(1, "stranger"), node(2, null)], true, "page2")
        : page([node(3, "ALICE"), node(4, "stranger")], true, "page3");
    }),
  );
  assert.deepEqual(calls, [null, "page2"]);
  assert.deepEqual(
    result.data.map((s) => s.number),
    [3],
  );
  assert.deepEqual(result.pageInfo, { hasNextPage: true, endCursor: "page3" });
});

test("all-repo scope preserves all four statuses, with closed taking precedence over draft", async () => {
  const result = await sessionsList(
    context(
      async () =>
        page([
          node(1, "alice", "OPEN", true),
          node(2, "team"),
          node(3, null, "MERGED"),
          node(4, "other", "CLOSED", true),
        ]),
      null,
    ),
  );
  assert.deepEqual(
    result.data.map((s) => s.status),
    ["draft", "open", "merged", "closed"],
  );
  assert.ok(
    result.data.every((s) => s.owner === "target" && s.repo === "catalog"),
  );
});

test("sidebar session rows include management and branch deletion permissions", async () => {
  const result = await sessionsList(
    context(
      async () =>
        page([
          {
            ...node(1, "alice", "OPEN", true),
            viewerCanUpdate: true,
            headRefName: "alice/feature",
            headRef: { id: "REF_1" },
            headRepository: {
              name: "catalog",
              owner: { login: "alice" },
              viewerPermission: "WRITE",
              defaultBranchRef: { name: "main" },
            },
          },
          {
            ...node(2, "alice", "CLOSED", false),
            viewerCanUpdate: true,
            headRefName: "alice/closed",
            headRef: { id: "REF_2" },
            headRepository: {
              name: "catalog",
              owner: { login: "alice" },
              viewerPermission: "WRITE",
              defaultBranchRef: { name: "main" },
            },
          },
          {
            ...node(3, "alice", "OPEN", false),
            viewerCanUpdate: true,
            headRefName: "main",
            headRef: { id: "REF_3" },
            headRepository: {
              name: "catalog",
              owner: { login: "alice" },
              viewerPermission: "WRITE",
              defaultBranchRef: { name: "main" },
            },
          },
        ]),
      null,
    ),
  );
  assert.deepEqual(
    result.data.map((s) => ({
      number: s.number,
      canManage: s.canManage,
      canDelete: s.canDelete,
      branch: s.branch,
      headRepo: s.headRepo,
    })),
    [
      {
        number: 1,
        canManage: true,
        canDelete: true,
        branch: "alice/feature",
        headRepo: "catalog",
      },
      {
        number: 2,
        canManage: false,
        canDelete: false,
        branch: "alice/closed",
        headRepo: "catalog",
      },
      {
        number: 3,
        canManage: true,
        canDelete: false,
        branch: "main",
        headRepo: "catalog",
      },
    ],
  );
});

test("no available fork scope uses v1's author fallback", async () => {
  const result = await sessionsList(
    context(
      async () =>
        page([
          node(1, "team"),
          { ...node(2, "team"), author: { login: "someone-else" } },
        ]),
      [],
    ),
  );
  assert.deepEqual(
    result.data.map((s) => s.number),
    [1],
  );
});

test("empty results remain empty and pagination failures are retryable", async () => {
  const empty = await sessionsList(context(async () => page([])));
  assert.deepEqual(empty.data, []);
  const calls = [];
  await assert.rejects(
    sessionsList(
      context(async (_, variables) => {
        calls.push(variables.after);
        throw new Error("offline");
      }),
      "retry-cursor",
    ),
    /offline/,
  );
  const retried = await sessionsList(
    context(async (_, variables) => {
      calls.push(variables.after);
      return page([node(1, "alice")]);
    }),
    "retry-cursor",
  );
  assert.deepEqual(calls, ["retry-cursor", "retry-cursor"]);
  assert.equal(retried.data.length, 1);
});

test("direct session lookup enforces the same scope as the sidebar", async () => {
  const result = await sessionDetails(
    context(async (_, variables) => {
      assert.equal(variables.number, 7);
      return { repository: { pullRequest: node(7, "alice") } };
    }),
    7,
  );
  assert.equal(result.number, 7);
  await assert.rejects(
    sessionDetails(
      context(async () => ({
        repository: { pullRequest: node(8, "other") },
      })),
      8,
    ),
    { status: 404 },
  );
});

test("user-facing failures never echo raw request or credential details", () => {
  for (const status of [401, 403, 404, 429, 500]) {
    const message = sessionError({ status, message: "sensitive-request-data" });
    assert.ok(message.length > 0);
    assert.ok(!message.includes("sensitive-request-data"));
  }
});
