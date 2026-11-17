import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import {
  filterSessions,
  groupSessions,
  sessionFilterSummary,
} from "../src2/helpers/session-filters.js";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith("@/")
        ? new URL(`../src2/${specifier.slice(2)}`, import.meta.url).href
        : specifier,
      context,
    );
  },
});
const { default: useSessionsStore } =
  await import("../src2/stores/sessions.js");
const { default: useOctokitStore } = await import("../src2/stores/octokit.js");

const statuses = ["draft", "open", "merged", "closed"];
const sessions = [
  {
    id: "1",
    number: 1,
    title: "Zebra",
    status: "closed",
    updatedAt: "2026-11-14",
    owner: "earth",
    repo: "catalog",
  },
  {
    id: "2",
    number: 2,
    title: "Alpha",
    status: "open",
    updatedAt: "2026-11-13",
    owner: "earth",
    repo: "stories",
  },
  {
    id: "3",
    number: 3,
    title: "Beta",
    status: "draft",
    updatedAt: "2026-11-12",
    owner: "science",
    repo: "catalog",
  },
  {
    id: "4",
    number: 4,
    title: "Gamma",
    status: "merged",
    updatedAt: "2026-11-11",
    owner: "earth",
    repo: "catalog",
  },
  {
    id: "5",
    number: 5,
    title: "Delta",
    status: "draft",
    updatedAt: "2026-11-10",
    owner: "science",
    repo: "catalog",
  },
];

test("status multi-select supports any combination and no selections", () => {
  assert.deepEqual(
    filterSessions(sessions, ["draft", "open"], "recent").map((s) => s.id),
    ["2", "3", "5"],
  );
  assert.deepEqual(filterSessions(sessions, [], "recent"), []);
  assert.equal(filterSessions(sessions, statuses, "recent").length, 5);
});

test("all four sorts match the reference and leave the source unchanged", () => {
  const original = sessions.map((s) => s.id);
  const ids = (sort) =>
    filterSessions(sessions, statuses, sort).map((s) => s.id);
  assert.deepEqual(ids("recent"), ["1", "2", "3", "4", "5"]);
  assert.deepEqual(ids("pr"), ["5", "4", "3", "2", "1"]);
  assert.deepEqual(ids("title"), ["2", "3", "5", "4", "1"]);
  assert.deepEqual(ids("status"), ["3", "5", "2", "4", "1"]);
  assert.deepEqual(
    sessions.map((s) => s.id),
    original,
  );
});

test("groups separate same-named repositories across owners and keep row sort order", () => {
  const sorted = filterSessions(sessions, statuses, "pr");
  const repos = groupSessions(sorted, "repo");
  assert.deepEqual(
    repos.map((g) => g.title),
    ["earth/catalog", "earth/stories", "science/catalog"],
  );
  assert.deepEqual(
    repos[0].sessions.map((s) => s.number),
    [4, 1],
  );
  assert.deepEqual(
    groupSessions(sorted, "org").map((g) => g.sessions.length),
    [3, 2],
  );
  assert.equal(groupSessions(sorted, "none")[0].sessions.length, 5);
});

test("summary distinguishes defaults, cleared statuses, sorting, and grouping", () => {
  assert.equal(sessionFilterSummary(statuses, "recent", "none"), "");
  assert.equal(sessionFilterSummary([], "recent", "none"), "No statuses");
  assert.equal(
    sessionFilterSummary(["open", "draft"], "pr", "org"),
    "Draft, Open · By pr number · Grouped by organization",
  );
});

function createStore(graphql) {
  setActivePinia(createPinia());
  useOctokitStore().setOctokit({
    octokit: { graphql },
    githubConfig: { username: "earth", repo: "catalog" },
    githubUserData: { login: "alice" },
    scopeOwners: ["alice"],
  });
  return useSessionsStore();
}

function page(number, state, hasNextPage = false, endCursor = null) {
  return {
    repository: {
      pullRequests: {
        nodes: [
          {
            id: `PR_${number}`,
            number,
            title: `Session ${number}`,
            state,
            isDraft: false,
            updatedAt: "2026-11-14",
            author: { login: "alice" },
            headRepositoryOwner: { login: "alice" },
          },
        ],
        pageInfo: { hasNextPage, endCursor },
      },
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("status changes abort the old request, restart at page one, and ignore its late response", async () => {
  const old = deferred();
  const fresh = deferred();
  const oldStarted = deferred();
  const freshStarted = deferred();
  const calls = [];
  const store = createStore(async (_, options) => {
    calls.push(options);
    if (calls.length === 1) {
      oldStarted.resolve();
      return old.promise;
    }
    if (calls.length === 2) {
      freshStarted.resolve();
      return fresh.promise;
    }
    return page(3, "CLOSED");
  });
  const initialLoad = store.loadSessions();
  await oldStarted.promise;
  const latestLoad = store.toggleStatus("closed");
  await freshStarted.promise;
  store.setGroup("org");
  assert.equal(calls[0].request.signal.aborted, true);
  assert.deepEqual(
    calls.map((call) => call.after),
    [null, null],
  );
  old.resolve(page(1, "CLOSED", true, "stale-cursor"));
  await initialLoad;
  assert.equal(store.loading, true);
  assert.equal(store.error, "");
  assert.equal(store.sessions.length, 0);
  fresh.resolve(page(2, "OPEN", true, "fresh-next"));
  await latestLoad;
  assert.deepEqual(
    calls.map((call) => call.after),
    [null, null, "fresh-next"],
  );
  assert.equal(store.allLoaded, true);
  assert.deepEqual(
    store.visibleSessions.map((session) => session.number),
    [2],
  );
  assert.equal(store.statusCounts.closed, 1);
  assert.equal(store.statusCounts.open, 1);
  assert.equal(store.sessionGroups[0].label, "earth");
});

test("sort changes discard old pages and ignore an obsolete pagination error", async () => {
  const old = deferred();
  const fresh = deferred();
  const oldStarted = deferred();
  const freshStarted = deferred();
  const calls = [];
  const store = createStore(async (_, options) => {
    calls.push(options);
    if (calls.length === 1) return page(1, "CLOSED", true, "old-next");
    if (calls.length === 2) {
      oldStarted.resolve();
      return old.promise;
    }
    if (calls.length === 3) {
      freshStarted.resolve();
      return fresh.promise;
    }
    return page(10, "OPEN");
  });
  await store.loadSessions();
  const olderLoad = store.loadSessions();
  await oldStarted.promise;
  const latestLoad = store.setSort("pr");
  assert.equal(store.sessions.length, 0);
  assert.equal(store.pageInfo, null);
  await freshStarted.promise;
  old.reject(new Error("old request failed"));
  await olderLoad;
  assert.equal(store.error, "");
  assert.equal(store.loading, true);
  fresh.resolve(page(9, "OPEN", true, "new-next"));
  await latestLoad;
  assert.deepEqual(
    calls.map((call) => call.after),
    [null, "old-next", null, "new-next"],
  );
  assert.deepEqual(
    store.visibleSessions.map((session) => session.number),
    [10, 9],
  );
});

test("completed lists refresh on status and sort changes and when clearing them", async () => {
  const calls = [];
  const store = createStore(async (_, { after }) => {
    calls.push(after);
    return page(calls.length, "OPEN");
  });
  await store.loadSessions();
  await store.toggleStatus("closed");
  assert.deepEqual(
    store.sessions.map((session) => session.number),
    [2],
  );
  await store.setSort("title");
  assert.deepEqual(
    store.sessions.map((session) => session.number),
    [3],
  );
  store.setGroup("repo");
  store.toggleGroup(store.sessionGroups[0].id);
  await store.clearFilters();
  assert.deepEqual(calls, [null, null, null, null]);
  assert.deepEqual(
    store.sessions.map((session) => session.number),
    [4],
  );
  assert.equal(store.filtersActive, false);
  assert.equal(store.collapsedGroups.size, 0);
  await store.setSort("recent");
  assert.equal(calls.length, 4);
});

test("an incomplete filtered scan retains its cursor and retries without duplicate rows", async () => {
  let fail = true;
  const cursors = [];
  const store = createStore(async (_, { after }) => {
    cursors.push(after);
    if (after === null) return page(1, "CLOSED", true, "next");
    if (fail) throw new Error("offline");
    return page(2, "OPEN");
  });
  store.sort = "title";
  await store.loadSessions(false, true);
  assert.ok(store.error);
  assert.equal(store.allLoaded, false);
  assert.equal(store.sessions.length, 1);
  fail = false;
  await store.loadSessions();
  assert.equal(store.error, "");
  assert.equal(store.allLoaded, true);
  assert.deepEqual(cursors, [null, "next", "next"]);
  assert.deepEqual(
    store.sessions.map((s) => s.number),
    [1, 2],
  );
});

test("retry finishes a full count scan even before any filters are changed", async () => {
  let fail = true;
  const cursors = [];
  const store = createStore(async (_, { after }) => {
    cursors.push(after);
    if (after === null) return page(1, "CLOSED", true, "second");
    if (after === "second") {
      if (fail) throw new Error("offline");
      return page(2, "OPEN", true, "third");
    }
    return page(3, "MERGED");
  });
  await store.loadSessions(false, true);
  assert.equal(store.filtersActive, false);
  assert.ok(store.error);
  fail = false;
  await store.loadSessions();
  assert.equal(store.allLoaded, true);
  assert.deepEqual(cursors, [null, "second", "second", "third"]);
  assert.equal(store.sessions.length, 3);
});

test("opening the filter popover refreshes counts across all pages even after completion", async () => {
  let round = 0;
  const cursors = [];
  const store = createStore(async (_, { after }) => {
    cursors.push(after);
    if (after === null) {
      round++;
      return page(1, round === 1 ? "OPEN" : "MERGED", true, "next");
    }
    return page(2, "CLOSED");
  });
  await store.loadSessions(false, true);
  assert.equal(store.allLoaded, true);
  assert.equal(store.statusCounts.open, 1);
  assert.equal(store.statusCounts.merged, 0);
  assert.equal(store.statusCounts.closed, 1);

  await store.loadSessions(false, true, true);
  assert.deepEqual(cursors, [null, "next", null, "next"]);
  assert.equal(store.allLoaded, true);
  assert.equal(store.statusCounts.open, 0);
  assert.equal(store.statusCounts.merged, 1);
  assert.equal(store.statusCounts.closed, 1);
});

test("opening a session fetches fresh details even when its sidebar row is cached", async () => {
  let requests = 0;
  const store = createStore(async (query, variables) => {
    requests++;
    assert.equal(variables.number, 7);
    assert.match(query, /headRefName/);
    return {
      repository: {
        pullRequest: {
          id: "PR_7",
          number: 7,
          title: "Fresh title",
          state: "OPEN",
          isDraft: true,
          headRepositoryOwner: { login: "alice" },
          headRefName: "gc/seven",
          changedFiles: 3,
          viewerCanUpdate: true,
          statusCheckRollup: { state: "PENDING" },
        },
      },
    };
  });
  store.sessions = [
    { id: "PR_7", number: 7, title: "Old title", status: "open" },
  ];
  const session = await store.getSession(7);
  assert.equal(requests, 1);
  assert.equal(session.branch, "gc/seven");
  assert.equal(session.checks, "PENDING");
  assert.equal(store.sessions[0].title, "Fresh title");
  assert.equal(store.sessions[0].status, "draft");
});
