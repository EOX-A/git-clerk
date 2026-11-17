import assert from "node:assert/strict";
import test from "node:test";
import { Base64 } from "js-base64";
import { publishOscFiles } from "../src2/api/osc-publish.js";
import { prepareOscDraft } from "../src2/helpers/prepare-osc-draft.js";

const bundle = {
  draft: { title: "Add synthetic OSC" },
  validation: { valid: true },
  staged_files: {
    "products/new/collection.json": { id: "new", links: [] },
    "products/catalog.json": {
      id: "products",
      links: [{ rel: "child", href: "./new/collection.json" }],
    },
  },
};
const existingSession = {
  number: 7,
  title: "Existing PR title",
  body: "Keep the review notes.",
  headOwner: "upstream",
  headRepo: "catalog",
  branch: "session/alice/existing",
  baseBranch: "main",
  headSha: "previous",
  canEdit: true,
  status: "open",
};
test("AI files publish without schema fetches or schema validation", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("No schema fetch expected");
  });
  // Intentionally missing STAC required fields: schema validation is deferred.
  const draft = {
    title: "Sample",
    files: { "products/new/collection.json": { id: "new" } },
  };
  const prepared = prepareOscDraft(draft);
  assert.equal(prepared.validation, undefined);
  const f = fixture();
  await publishOscFiles(f.context, prepared, {}, null, f.publish, f.details);
  assert.equal(
    JSON.parse(f.request().files["products/new/collection.json"]).id,
    "new",
  );
  assert.equal(fetch.mock.callCount(), 0);
});
test("the reported Snow cover path and non-schema file contents reach the broker unchanged", async () => {
  const files = {
    "variables/Snow cover/catalog.json": {
      id: "Snow cover",
      arbitrary: "No schema validation",
    },
    "notes/read me.md": "# Notes\n",
    "experiments/nested/data.json": [1, 2],
  };
  const f = fixture();
  await publishOscFiles(
    f.context,
    prepareOscDraft({ title: "Sample", files }),
    {},
    null,
    f.publish,
    f.details,
  );
  assert.deepEqual(Object.keys(f.request().files), Object.keys(files));
  assert.deepEqual(
    JSON.parse(f.request().files["variables/Snow cover/catalog.json"]),
    files["variables/Snow cover/catalog.json"],
  );
  assert.equal(
    f.request().files["notes/read me.md"],
    files["notes/read me.md"],
  );
  assert.deepEqual(
    JSON.parse(f.request().files["experiments/nested/data.json"]),
    [1, 2],
  );
});
function fixture() {
  const calls = [];
  const files = {
    "products/catalog.json": {
      id: "products",
      title: "Preserve title",
      links: [{ rel: "child", href: "./old/collection.json" }],
    },
  };
  let published, request;
  const context = {
    githubConfig: { username: "upstream", repo: "catalog" },
    githubUserData: { id: 123, login: "alice" },
    githubTargetRepo: { default_branch: "main", permissions: { push: false } },
    octokit: {
      auth: async () => ({ token: "fixture-token" }),
      rest: {
        repos: {
          get: async () => ({
            data: { permissions: { push: true }, default_branch: "main" },
          }),
          getContent: async ({ path, ref }) => {
            const content =
              ref === "published"
                ? request.files[path]
                : files[path] && JSON.stringify(files[path]);
            if (!content)
              throw Object.assign(new Error("missing"), { status: 404 });
            return {
              data: {
                type: "file",
                encoding: "base64",
                size: content.length,
                content: Base64.encode(content),
              },
            };
          },
        },
        git: {
          getRef: async ({ ref }) => {
            if (ref === "heads/main")
              return { data: { object: { sha: "base" } } };
            if (published) return { data: { object: { sha: "published" } } };
            throw Object.assign(new Error("missing"), { status: 404 });
          },
        },
        pulls: {
          list: async () => ({
            data: published
              ? [
                  {
                    number: 7,
                    head: {
                      sha: "published",
                      repo: { full_name: "upstream/catalog" },
                    },
                    base: { ref: "main" },
                  },
                ]
              : [],
          }),
        },
      },
    },
  };
  const publish = async (input) => {
    calls.push("broker");
    request = input;
    published = {
      number: 7,
      headOwner: "upstream",
      headRepo: "catalog",
      branch: input.targetBranch,
      headSha: "published",
      baseBranch: "main",
      status: "open",
    };
    return { pr_number: 7, commit_sha: "published" };
  };
  const details = async () => published;
  return {
    context,
    files,
    calls,
    publish,
    details,
    request: () => request,
  };
}
test("new OSC publication sends exact generated files without preflight reads", async () => {
  const f = fixture();
  for (const api of Object.values(f.context.octokit.rest))
    for (const method of Object.keys(api))
      api[method] = async () => {
        throw new Error("Unexpected GitHub preflight request");
      };
  const result = await publishOscFiles(
    f.context,
    bundle,
    {},
    null,
    f.publish,
    f.details,
  );
  assert.deepEqual(f.calls, ["broker"]);
  assert.equal(result.session.number, 7);
  assert.equal(result.session.headOwner, "upstream");
  const request = f.request();
  assert.equal(request.repo, "upstream/catalog");
  assert.match(request.targetBranch, /^session\/alice\/[a-f0-9-]+$/);
  assert.equal(Object.hasOwn(request, "author"), false);
  const catalog = JSON.parse(request.files["products/catalog.json"]);
  assert.deepEqual(catalog, bundle.staged_files["products/catalog.json"]);
  assert.equal(request.baseBranch, "main");
  assert.ok(result.files.every((file) => file.status === "Saved"));
  assert.ok(request.files["products/new/collection.json"].endsWith("\n"));
  assert.equal(
    result.documents["products/new/collection.json"].text,
    request.files["products/new/collection.json"],
  );
  assert.match(
    result.documents["products/new/collection.json"].sha,
    /^[a-f0-9]{40}$/,
  );
});
test("lost broker responses reconcile by reads without resending or overwriting branches", async () => {
  const f = fixture();
  const attempt = {};
  const publish = async (input) => {
    await f.publish(input);
    throw new Error("Lost reply");
  };
  await assert.rejects(
    publishOscFiles(f.context, bundle, attempt, null, publish, f.details),
    /Lost reply/,
  );
  const result = await publishOscFiles(
    f.context,
    bundle,
    attempt,
    null,
    publish,
    f.details,
  );
  assert.equal(result.session.number, 7);
  assert.equal(f.calls.filter((call) => call === "broker").length, 1);
  assert.equal(
    result.documents["products/new/collection.json"].text,
    f.request().files["products/new/collection.json"],
  );
});
test("PR loading retries reuse a confirmed broker response", async () => {
  const f = fixture();
  const attempt = {};
  await assert.rejects(
    publishOscFiles(f.context, bundle, attempt, null, f.publish, async () => {
      throw new Error("Read failed");
    }),
    /Read failed/,
  );
  await publishOscFiles(f.context, bundle, attempt, null, f.publish, f.details);
  assert.equal(f.calls.filter((call) => call === "broker").length, 1);
});
test("existing-session edits start from the PR branch and retain PR identity and description", async () => {
  const f = fixture();
  for (const api of Object.values(f.context.octokit.rest))
    for (const method of Object.keys(api))
      api[method] = async () => {
        throw new Error("Unexpected preflight read");
      };
  const result = await publishOscFiles(
    f.context,
    bundle,
    {},
    existingSession,
    f.publish,
    f.details,
  );
  assert.equal(result.session.number, 7);
  assert.equal(f.request().baseBranch, existingSession.branch);
  assert.equal(f.request().targetBranch, existingSession.branch);
  assert.equal(f.request().existingPrNumber, 7);
  assert.equal(f.request().prTitle, existingSession.title);
  assert.equal(f.request().prBody, existingSession.body);
  assert.equal(f.request().title, bundle.draft.title);
  assert.deepEqual(
    Object.keys(f.request().files),
    Object.keys(bundle.staged_files),
  );
});
test("existing-session retries reconcile against the actual PR base without another write", async () => {
  const f = fixture();
  const attempt = {};
  const publish = async (input) => {
    await f.publish(input);
    throw new Error("Lost reply");
  };
  await assert.rejects(
    publishOscFiles(
      f.context,
      bundle,
      attempt,
      existingSession,
      publish,
      f.details,
    ),
    /Lost reply/,
  );
  const list = f.context.octokit.rest.pulls.list;
  f.context.octokit.rest.pulls.list = async (args) => {
    assert.equal(args.base, "main");
    assert.equal(args.head, `upstream:${existingSession.branch}`);
    return list(args);
  };
  const result = await publishOscFiles(
    f.context,
    bundle,
    attempt,
    existingSession,
    publish,
    f.details,
  );
  assert.equal(result.session.number, 7);
  assert.deepEqual(f.calls, ["broker"]);
});
test("closed, cross-fork, default and incomplete session targets cannot be updated", async () => {
  const f = fixture();
  for (const change of [
    { status: "closed" },
    { status: "merged" },
    { canEdit: false },
    { headOwner: "alice" },
    { branch: "main" },
    { baseBranch: undefined },
    { branch: "develop", baseBranch: "develop" },
    { headSha: undefined },
  ])
    await assert.rejects(
      publishOscFiles(
        f.context,
        bundle,
        {},
        { ...existingSession, ...change },
        f.publish,
        f.details,
      ),
    );
  assert.deepEqual(f.calls, []);
});
test("an unchanged old head cannot confirm a failed update even if the files already matched", async () => {
  const f = fixture();
  const attempt = {};
  await assert.rejects(
    publishOscFiles(
      f.context,
      bundle,
      attempt,
      existingSession,
      async () => {
        throw new Error("Lost reply");
      },
      f.details,
    ),
  );
  f.context.octokit.rest.git.getRef = async () => ({
    data: { object: { sha: "previous" } },
  });
  await assert.rejects(
    publishOscFiles(
      f.context,
      bundle,
      attempt,
      existingSession,
      f.publish,
      f.details,
    ),
    /no confirmed branch/,
  );
  assert.deepEqual(f.calls, []);
});
test("an update result for a different PR or base is never reported as saved", async () => {
  for (const change of [{ number: 8 }, { baseBranch: "develop" }]) {
    const f = fixture();
    await assert.rejects(
      publishOscFiles(
        f.context,
        bundle,
        {},
        existingSession,
        f.publish,
        async () => ({ ...(await f.details()), ...change }),
      ),
      /no longer matches/,
    );
  }
});
test("an uncertain update cannot be retried against a different session", async () => {
  const f = fixture();
  const attempt = {};
  await assert.rejects(
    publishOscFiles(
      f.context,
      bundle,
      attempt,
      existingSession,
      async () => {
        throw new Error("Lost reply");
      },
      f.details,
    ),
  );
  await assert.rejects(
    publishOscFiles(
      f.context,
      bundle,
      attempt,
      { ...existingSession, number: 8 },
      f.publish,
      f.details,
    ),
    /changed/,
  );
  assert.deepEqual(f.calls, []);
});
test("publication reuses the configured repository's non-main default branch", async () => {
  const f = fixture();
  f.context.githubTargetRepo.default_branch = "develop";
  await publishOscFiles(f.context, bundle, {}, null, f.publish, f.details);
  assert.equal(f.request().baseBranch, "develop");
});

test("an uncertain request with no confirmed branch is never blindly resubmitted", async () => {
  const f = fixture();
  const attempt = {};
  await assert.rejects(
    publishOscFiles(
      f.context,
      bundle,
      attempt,
      null,
      async () => {
        throw new Error("Connection lost");
      },
      f.details,
    ),
  );
  await assert.rejects(
    publishOscFiles(f.context, bundle, attempt, null, f.publish, f.details),
    /no confirmed branch/,
  );
  assert.ok(!f.calls.includes("broker"));
});

test("broker file serialization preserves uppercase mission IDs and paths", async () => {
  const f = fixture();
  const files = {
    "eo-missions/Sentinel-1/catalog.json": { id: "Sentinel-1" },
    "eo-missions/CryoSat-2/catalog.json": { id: "CryoSat-2" },
  };
  await publishOscFiles(
    f.context,
    { ...bundle, staged_files: files },
    {},
    null,
    f.publish,
    f.details,
  );
  assert.deepEqual(Object.keys(f.request().files), Object.keys(files));
  assert.equal(
    JSON.parse(f.request().files["eo-missions/CryoSat-2/catalog.json"]).id,
    "CryoSat-2",
  );
});
