import assert from "node:assert/strict";
import test from "node:test";
import { sessionDetails } from "../src2/api/session.js";
import { updateSession } from "../src2/api/session-actions.js";
import {
  canSubmitSession,
  sessionChecks,
} from "../src2/helpers/session-checks.js";

const pullRequest = (overrides = {}) => ({
  id: "PR_7",
  number: 7,
  title: "Session seven",
  url: "https://github.com/target/catalog/pull/7",
  state: "OPEN",
  isDraft: true,
  author: { login: "alice" },
  headRepositoryOwner: { login: "alice" },
  headRefName: "gc/seven",
  headRefOid: "head-sha",
  changedFiles: 2,
  viewerCanUpdate: true,
  reviewDecision: null,
  statusCheckRollup: { state: "SUCCESS" },
  headRef: { id: "REF_7" },
  headRepository: {
    name: "personal-catalog",
    owner: { login: "alice" },
    viewerPermission: "WRITE",
    defaultBranchRef: { name: "main" },
  },
  ...overrides,
});
function fixture(node = pullRequest()) {
  const calls = [];
  const context = {
    githubConfig: { username: "target", repo: "catalog" },
    githubUserData: { login: "alice" },
    scopeOwners: ["alice"],
    octokit: {
      graphql: async (query, variables) => {
        calls.push({ query, variables });
        if (query.includes("mutation"))
          return {
            markPullRequestReadyForReview: { pullRequest: { id: node.id } },
          };
        return { repository: { pullRequest: node } };
      },
      rest: {
        pulls: {
          update: async (params) => {
            calls.push({ update: params });
            return { data: {} };
          },
        },
        git: {
          deleteRef: async (params) => {
            calls.push({ deleteRef: params });
            return {};
          },
        },
      },
    },
  };
  return { calls, context };
}

test("header details include actual branch, changes, rollup and permissions", async () => {
  const { context, calls } = fixture();
  const controller = new AbortController();
  const session = await sessionDetails(context, 7, controller.signal);
  assert.equal(session.branch, "gc/seven");
  assert.equal(session.headOwner, "alice");
  assert.equal(session.headRepo, "personal-catalog");
  assert.equal(session.changedFiles, 2);
  assert.equal(session.checks, "SUCCESS");
  assert.equal(session.canManage, true);
  assert.equal(session.canDelete, true);
  assert.equal(calls[0].variables.request.signal, controller.signal);
  assert.match(calls[0].query, /statusCheckRollup/);
});

test("all rollup states and current requested changes are represented truthfully", () => {
  const expectations = {
    PENDING: "Checks running",
    EXPECTED: "Checks running",
    FAILURE: "Checks failed",
    ERROR: "Checks failed",
    SUCCESS: "Checks passed",
  };
  for (const [checks, label] of Object.entries(expectations))
    assert.equal(sessionChecks({ checks }).label, label);
  assert.equal(sessionChecks({ checks: null }), null);
  assert.equal(
    sessionChecks({ checks: "SUCCESS", reviewDecision: "CHANGES_REQUESTED" })
      .label,
    "Changes requested",
  );
});

test("read-only PRs cannot be renamed or deleted even with update permission", async () => {
  for (const state of ["CLOSED", "MERGED"]) {
    const { context, calls } = fixture(pullRequest({ state }));
    assert.equal((await sessionDetails(context, 7)).canManage, false);
    await assert.rejects(updateSession(context, 7, "rename", "New title"));
    await assert.rejects(updateSession(context, 7, "delete"));
    assert.ok(calls.every((call) => !call.update && !call.deleteRef));
  }
});

test("default branches and unwritable forks are never deleted", async () => {
  for (const overrides of [
    { headRefName: "main" },
    {
      headRepository: {
        ...pullRequest().headRepository,
        viewerPermission: "READ",
      },
    },
  ]) {
    const { context, calls } = fixture(pullRequest(overrides));
    assert.equal((await sessionDetails(context, 7)).canDelete, false);
    await assert.rejects(updateSession(context, 7, "delete"));
    assert.ok(calls.every((call) => !call.update && !call.deleteRef));
  }
});

test("rename rechecks scope and permissions, then updates the target PR", async () => {
  const { context, calls } = fixture();
  await updateSession(context, 7, "rename", "  Updated title  ");
  assert.deepEqual(calls[1].update, {
    owner: "target",
    repo: "catalog",
    pull_number: 7,
    title: "Updated title",
  });
  for (const overrides of [
    { viewerCanUpdate: false },
    { headRepositoryOwner: { login: "stranger" } },
  ]) {
    const other = fixture(pullRequest(overrides));
    await assert.rejects(updateSession(other.context, 7, "rename", "Title"));
    assert.ok(other.calls.every((call) => !call.update));
  }
});

test("review uses the PR node ID and refuses incomplete or failed checks", async () => {
  const { context, calls } = fixture();
  await updateSession(context, 7, "review");
  assert.equal(calls[1].variables.pullRequestId, "PR_7");
  assert.match(calls[1].query, /markPullRequestReadyForReview/);
  for (const overrides of [
    { statusCheckRollup: { state: "PENDING" } },
    { statusCheckRollup: { state: "FAILURE" } },
    { changedFiles: 0 },
    { isDraft: false },
    { reviewDecision: "CHANGES_REQUESTED" },
  ]) {
    const blocked = fixture(pullRequest(overrides));
    await assert.rejects(updateSession(blocked.context, 7, "review"));
    assert.equal(blocked.calls.length, 1);
  }
  const noChecks = await sessionDetails(
    fixture(pullRequest({ statusCheckRollup: null })).context,
    7,
  );
  assert.equal(canSubmitSession(noChecks), true);
});

test("delete closes the target PR then deletes the actual fork branch", async () => {
  const { context, calls } = fixture();
  await updateSession(context, 7, "delete");
  assert.deepEqual(calls[1].update, {
    owner: "target",
    repo: "catalog",
    pull_number: 7,
    state: "closed",
  });
  assert.deepEqual(calls[2].deleteRef, {
    owner: "alice",
    repo: "personal-catalog",
    ref: "heads/gc/seven",
  });
});

test("an already missing branch only closes the PR; partial deletion is reported", async () => {
  const absent = fixture(pullRequest({ headRef: null, headRepository: null }));
  await updateSession(absent.context, 7, "delete");
  assert.equal(absent.calls.length, 2);
  const partial = fixture();
  partial.context.octokit.rest.git.deleteRef = async () => {
    throw new Error("private request details");
  };
  await assert.rejects(updateSession(partial.context, 7, "delete"), {
    code: "SESSION_BRANCH_DELETE_FAILED",
    message: "The PR was closed, but its branch could not be deleted.",
  });
  assert.equal(partial.calls[1].update.state, "closed");
});

test("aborted header responses never become session data", async () => {
  const { context } = fixture();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(sessionDetails(context, 7, controller.signal), {
    name: "AbortError",
  });
});
