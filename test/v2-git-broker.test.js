import assert from "node:assert/strict";
import test from "node:test";
import { publishGitBundle } from "../src2/api/git-broker.js";

const request = {
  repo: "alice/catalog",
  baseBranch: "main",
  targetBranch: "session/alice/sample",
  title: "Add sample OSC",
  files: { "products/sample/collection.json": '{"id":"sample"}\n' },
  author: { name: "Alice", email: "alice@example.test", username: "alice" },
  token: "test-only-token",
};
const result = {
  status: "published",
  mode: "github_live",
  provider: "github",
  repo: request.repo,
  branch: request.targetBranch,
  commit_sha: "a".repeat(40),
  pr_number: 7,
  pr_url: "https://github.com/alice/catalog/pull/7",
};
test("publishing calls the broker through the gateway with exact file strings and token header", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(result),
  );
  assert.deepEqual(await publishGitBundle(request), result);
  const [url, options] = mock.mock.calls[0].arguments;
  assert.equal(url, "http://localhost:8000/api/mcp/call");
  assert.equal(options.headers["X-Git-Token"], request.token);
  assert.ok(!options.body.includes(request.token));
  const body = JSON.parse(options.body);
  assert.equal(body.server_id, "eox-git-broker");
  assert.equal(body.tool_name, "git_publish_bundle");
  assert.deepEqual(body.arguments.files, request.files);
  assert.deepEqual(body.arguments.author, request.author);
  assert.equal(body.arguments.base_branch, "main");
  assert.equal(body.arguments.target_branch, request.targetBranch);
  assert.equal(body.arguments.dry_run, false);
  assert.equal(mock.mock.callCount(), 1);
});
test("publishing omits optional author when none is supplied", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(result),
  );
  const { author, ...withoutAuthor } = request;
  assert.deepEqual(await publishGitBundle(withoutAuthor), result);
  const body = JSON.parse(mock.mock.calls[0].arguments[1].body);
  assert.equal(Object.hasOwn(body.arguments, "author"), false);
});
test("updates use the existing branch as commit base and require the same PR in the result", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(result),
  );
  const update = {
    ...request,
    baseBranch: request.targetBranch,
    existingPrNumber: 7,
    prTitle: "Original PR title",
    prBody: "Original review notes",
  };
  await publishGitBundle(update);
  const args = JSON.parse(mock.mock.calls[0].arguments[1].body).arguments;
  assert.equal(args.base_branch, args.target_branch);
  assert.equal(args.pr_title, update.prTitle);
  assert.equal(args.pr_body, update.prBody);
  assert.equal(args.commit_message, request.title);
  assert.equal(Object.hasOwn(args, "existingPrNumber"), false);
  mock.mock.mockImplementation(async () =>
    Response.json({
      ...result,
      pr_number: 8,
      pr_url: "https://github.com/alice/catalog/pull/8",
    }),
  );
  await assert.rejects(publishGitBundle(update), /does not match/);
  await assert.rejects(
    publishGitBundle({ ...update, baseBranch: "main" }),
    /separate session branch/,
  );
});
test("updates with an empty PR description do not trigger the broker's default body", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(result),
  );
  await publishGitBundle({
    ...request,
    baseBranch: request.targetBranch,
    existingPrNumber: 7,
    prBody: "",
  });
  assert.equal(
    JSON.parse(mock.mock.calls[0].arguments[1].body).arguments.pr_body,
    "\n",
  );
});
test("simulated or mismatched responses cannot be reported as a live PR", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  for (const change of [
    { mode: "sandbox_dry_run" },
    { status: "error" },
    { repo: "someone/else" },
    { branch: "main" },
    { pr_url: "https://example.test/7" },
    { commit_sha: "missing" },
  ]) {
    mock.mock.mockImplementation(async () =>
      Response.json({ ...result, ...change }),
    );
    await assert.rejects(publishGitBundle(request));
  }
  mock.mock.mockImplementation(async () =>
    Response.json({ ...result, mode: "sandbox_dry_run" }),
  );
  assert.equal(
    (await publishGitBundle({ ...request, token: undefined, dryRun: true }))
      .mode,
    "sandbox_dry_run",
  );
});
test("broker failures never echo credentials or retry automatically", async (t) => {
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(request.token, { status: 500 }),
  );
  await assert.rejects(
    publishGitBundle(request),
    (error) =>
      error.message.includes("HTTP 500") &&
      !error.message.includes(request.token),
  );
  assert.equal(mock.mock.callCount(), 1);
  await assert.rejects(
    publishGitBundle({ ...request, token: undefined }),
    /Connect GitHub/,
  );
  await assert.rejects(
    publishGitBundle({ ...request, targetBranch: "main" }),
    /separate session branch/,
  );
  assert.equal(mock.mock.callCount(), 1);
});
