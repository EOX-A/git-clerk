import assert from "node:assert/strict";
import test from "node:test";
import { Base64 } from "js-base64";
import { gitBrokerConfig, initGitBroker } from "../src2/api/git-broker.js";
import { sessionsList, sessionDetails } from "../src2/api/session.js";
import { createSession } from "../src2/api/session-create.js";
import { updateSession } from "../src2/api/session-actions.js";
import { branchDirectory, sessionFiles } from "../src2/api/file.js";
import {
  deleteFileContent,
  fileContent,
  fileDiff,
  saveFileContent,
} from "../src2/api/file-content.js";
import { publishChatFiles } from "../src2/api/chat-publish.js";

const user = {
  username: "Alice.Example",
  name: "Alice Example",
  email: "alice@example.test",
};
const repo = {
  repo: "team/catalog",
  provider: "github",
  default_branch: "trunk",
  html_url: "https://github.com/team/catalog",
};
const pr = {
  number: 7,
  title: "Session",
  state: "open",
  draft: true,
  head_branch: "session/alice-example/story",
  base_branch: "trunk",
  head_sha: "old-head",
  changed_files: 2,
  ci_status: "success",
  review_status: "pending",
  author: "broker-bot",
  body: "Description",
  html_url: `${repo.html_url}/pull/7`,
};
const config = {
  baseUrl: "/workspace/broker",
  provider: "github",
  repo: "team/catalog",
  user,
};

async function fixture(handle) {
  const log = [];
  const context = await initGitBroker(config, async (rawUrl, options) => {
    const url = new URL(rawUrl, "https://app.test");
    const path = url.pathname.replace("/workspace/broker/api/git", "");
    const call = {
      path,
      method: options.method,
      url: rawUrl,
      query: url.searchParams,
      headers: options.headers,
      credentials: options.credentials,
      signal: options.signal,
      body: options.body ? JSON.parse(options.body) : null,
    };
    log.push(call);
    if (path === "/repo") return Response.json(repo);
    const result = await handle(call);
    return result instanceof Response ? result : Response.json(result);
  });
  return { context, log };
}

test("broker configuration is independent of chat and does not read GitHub credentials", async () => {
  const actual = gitBrokerConfig(
    {
      gitClerkConfig: {
        gitBrokerUrl: "/gateway/git/",
        gitBroker: { repo: repo.repo },
        chat: { backend: { baseUrl: "/agentic" } },
      },
    },
    {
      GITCLERK_USERNAME: user.username,
      GITCLERK_PROFILE_NAME: user.name,
      GITCLERK_EMAIL: user.email,
      GITCLERK_GITHUB_TOKEN: "unused",
      GITCLERK_GITHUB_REPO: "legacy/repo",
    },
  );
  assert.deepEqual(actual, {
    baseUrl: "/gateway/git",
    repo: repo.repo,
    provider: undefined,
    user,
  });
  const { log } = await fixture();
  assert.equal(
    log[0].url,
    "/workspace/broker/api/git/repo?provider=github&repo=team%2Fcatalog",
  );
  assert.equal(log[0].credentials, "same-origin");
  assert.deepEqual(log[0].headers, { Accept: "application/json" });
});

test("session pages show every returned PR while preserving edit permissions", async () => {
  const { context, log } = await fixture(({ query }) => ({
    pull_requests:
      query.get("page") === "1"
        ? Array.from({ length: 20 }, (_, index) => ({
            ...pr,
            number: 100 + index,
            head_branch: `session/someone-else/story-${index}`,
          }))
        : [
            pr,
            {
              ...pr,
              number: 42,
              head_branch: "feature/catalog",
              author: user.username,
            },
            { ...pr, number: 43, merged: true, state: "closed" },
          ],
  }));
  const first = await sessionsList(context);
  assert.deepEqual(
    first.data.map(({ number }) => number),
    Array.from({ length: 20 }, (_, index) => 100 + index),
  );
  assert.ok(
    first.data.every(({ canEdit, canManage }) => !canEdit && !canManage),
  );
  assert.deepEqual(first.pageInfo, { hasNextPage: true, endCursor: 2 });
  assert.equal(log.length, 2);

  const result = await sessionsList(context, first.pageInfo.endCursor);
  assert.deepEqual(
    log.slice(1).map((call) => [...call.query].slice(-3)),
    [
      [
        ["state", "all"],
        ["page", "1"],
        ["per_page", "20"],
      ],
      [
        ["state", "all"],
        ["page", "2"],
        ["per_page", "20"],
      ],
    ],
  );
  assert.ok(log.every(({ query }) => !query.has("author")));
  assert.deepEqual(
    result.data.map(({ number, status, canEdit }) => [number, status, canEdit]),
    [
      [7, "draft", true],
      [42, "draft", false],
      [43, "merged", false],
    ],
  );
  assert.deepEqual(result.pageInfo, { hasNextPage: false, endCursor: null });
});

test("manual creation opens a draft with head_branch and retries a failed detail read without creating a duplicate", async () => {
  let branch;
  let reads = 0;
  const { context, log } = await fixture(({ path, method, body }) => {
    if (path === "/pulls" && method === "POST") {
      branch = body.head_branch;
      return { number: 7 };
    }
    if (++reads === 1)
      return Response.json(
        { detail: "Temporarily unavailable" },
        { status: 502 },
      );
    return { ...pr, head_branch: branch };
  });
  const attempt = {};
  await assert.rejects(createSession(context, " Day One ", attempt), {
    status: 502,
  });
  assert.equal(
    (await createSession(context, "Day One", attempt)).branch,
    branch,
  );
  assert.match(branch, /^session\/alice-example\/day-one-[a-f0-9]{8}$/);
  assert.deepEqual(log[1].body, {
    provider: "github",
    repo: repo.repo,
    title: "Day One",
    head_branch: branch,
    base_branch: "trunk",
    draft: true,
  });
  assert.equal(log.filter(({ method }) => method === "POST").length, 1);
});

test("session actions stay on the selected PR; read-only and failed-check sessions cannot submit", async () => {
  let detail = pr;
  const { context, log } = await fixture((call) =>
    call.method === "GET" ? detail : {},
  );
  for (const action of ["rename", "review", "close", "reopen", "delete"])
    await updateSession(context, 7, action, "  Renamed  ");
  const writes = log.filter((call) => call.method !== "GET");
  assert.deepEqual(
    writes.map(({ method, path }) => `${method} ${path}`),
    [
      "PATCH /pulls/7/rename",
      "POST /pulls/7/submit",
      "PATCH /pulls/7/state",
      "PATCH /pulls/7/state",
      "DELETE /pulls/7",
    ],
  );
  assert.equal(writes[0].body.title, "Renamed");
  assert.equal(writes[2].body.state, "closed");
  assert.equal(writes[3].body.state, "open");
  assert.equal(writes[4].query.get("delete_branch"), "true");
  detail = { ...pr, ci_status: "failed" };
  await assert.rejects(updateSession(context, 7, "review"), /not ready/);
  detail = { ...pr, head_branch: "session/other/branch" };
  await assert.rejects(
    updateSession(context, 7, "delete"),
    /cannot be changed/,
  );
  assert.equal(log.filter((call) => call.method !== "GET").length, 5);
});

test("the file browser loads scoped tree paths, text and explicit diffs and detects truncated change lists", async () => {
  const { context, log } = await fixture(({ path }) => {
    if (path === "/pulls/7") return pr;
    if (path.endsWith("/files"))
      return {
        files: [
          {
            filename: "folder/É.md",
            status: "modified",
            additions: 2,
            deletions: 1,
            patch: "not shown yet",
          },
        ],
      };
    if (path.endsWith("/diff"))
      return { patch: "@@ -1 +1 @@\n-old\n+new", status: "modified" };
    if (path === "/tree")
      return {
        entries: [
          { name: "É.md", path: "folder/É.md", type: "file" },
          { name: "more", path: "folder/more", type: "dir" },
        ],
      };
    return {
      content: Base64.encode("héllo 🌏\n"),
      size: 12,
      encoding: "base64",
      sha: "blob",
    };
  });
  const session = await sessionDetails(context, 7);
  const changed = await sessionFiles(context, session);
  assert.equal(changed.incomplete, true);
  assert.deepEqual(changed.files[0], {
    path: "folder/É.md",
    previousPath: null,
    status: "modified",
    additions: 2,
    deletions: 1,
  });
  assert.equal(
    (await branchDirectory(context, session, "folder"))[0].type,
    "folder",
  );
  assert.equal(
    (await fileContent(context, session, "/folder/É.md")).text,
    "héllo 🌏\n",
  );
  assert.match(
    (await fileDiff(context, session, "folder/É.md")).patch,
    /\+new/,
  );
  assert.equal(
    log.find((call) => call.path === "/tree").query.get("ref"),
    "old-head",
  );
  assert.equal(
    log.find((call) => call.path === "/file").query.get("path"),
    "folder/É.md",
  );
});

test("manual saves preserve the GitHub session branch, send author, and check for stale blobs", async () => {
  const { context, log } = await fixture(({ path, method, body }) => {
    if (path === "/pulls/7") return pr;
    if (path === "/file" && method === "GET") return { sha: "blob" };
    if (method === "DELETE") return { status: "deleted" };
    return {
      files_committed: [{ path: "story.md", sha: "new-blob" }],
      commit_sha: "head",
      branch: body.target_branch,
      pr_number: 7,
    };
  });
  const session = await sessionDetails(context, 7);
  await assert.rejects(
    saveFileContent(context, session, "story.md", "text", "stale"),
    { status: 409 },
  );
  assert.equal(
    log.some(({ path }) => path === "/publish"),
    false,
  );
  assert.deepEqual(
    await saveFileContent(context, session, "story.md", "héllo", "blob"),
    { sha: "new-blob", commitSha: "head" },
  );
  await deleteFileContent(context, session, "story.md", "new-blob");
  const [publish, remove] = log.slice(-2);
  assert.equal(publish.body.base_branch, pr.head_branch);
  assert.equal(publish.body.target_branch, pr.head_branch);
  assert.deepEqual(publish.body.files, { "story.md": "héllo" });
  assert.deepEqual(publish.body.author, user);
  assert.equal(publish.headers["X-Git-Session-Branch"], pr.head_branch);
  assert.deepEqual(remove.body.author, user);
  assert.equal(remove.body.sha, "new-blob");
  assert.equal(remove.method, "DELETE");
});

const draft = {
  title: "Example",
  staged_files: {
    "variables/Snow cover/catalog.json": { example: true },
    "stories/a.md": "# Example\n",
  },
};
const bundle = { ...draft, draft: { title: draft.title } };

test("new chat creates a draft before saving generated files to the same PR", async () => {
  let branch;
  let head = "draft-head";
  const { context, log } = await fixture(({ path, body, method }) => {
    if (path === "/pulls" && method === "POST") {
      branch = body.head_branch;
      return { number: 7 };
    }
    if (path === "/publish") {
      head = "saved";
      return {
        pr_number: 7,
        branch,
        commit_sha: head,
        files_committed: [{ path: "stories/a.md", sha: "story-blob" }],
      };
    }
    return { ...pr, head_branch: branch, head_sha: head };
  });
  const result = await publishChatFiles(context, bundle);
  assert.deepEqual(
    log.map(({ method, path }) => `${method} ${path}`),
    [
      "GET /repo",
      "POST /pulls",
      "GET /pulls/7",
      "POST /publish",
      "GET /pulls/7",
    ],
  );
  const [, create, , publish] = log;
  assert.equal(create.body.draft, true);
  assert.equal(create.body.title, bundle.draft.title);
  assert.equal(create.body.base_branch, "trunk");
  assert.equal(publish.body.base_branch, branch);
  assert.equal(publish.body.target_branch, branch);
  assert.equal(
    publish.body.files["variables/Snow cover/catalog.json"],
    '{\n  "example": true\n}\n',
  );
  assert.deepEqual(publish.body.author, user);
  assert.equal(publish.headers["X-Git-Session-Branch"], branch);
  assert.equal(publish.headers["X-Git-Token"], undefined);
  assert.equal(result.session.status, "draft");
  assert.equal(result.documents["stories/a.md"].sha, "story-blob");
});

test("retry recovers a lost draft creation response without creating another PR", async () => {
  let branch;
  let head = "draft-head";
  const { context, log } = await fixture(({ path, method, body }) => {
    if (path === "/pulls" && method === "POST") {
      branch = body.head_branch;
      return Response.json({ detail: "Connection lost" }, { status: 502 });
    }
    if (path === "/pulls")
      return { pull_requests: [{ ...pr, head_branch: branch }] };
    if (path === "/publish") {
      head = "saved";
      return { pr_number: 7, branch, commit_sha: head };
    }
    return { ...pr, head_branch: branch, head_sha: head };
  });
  const attempt = {};
  await assert.rejects(publishChatFiles(context, bundle, attempt), {
    status: 502,
  });
  assert.equal(attempt.requested, true);
  assert.equal(
    (await publishChatFiles(context, bundle, attempt)).session.number,
    7,
  );
  assert.deepEqual(
    log.filter(({ method }) => method === "POST").map(({ path }) => path),
    ["/pulls", "/publish"],
  );
});

test("a file save rejected after draft creation retries on the same draft branch", async () => {
  let branch;
  let head = "draft-head";
  let saves = 0;
  const { context, log } = await fixture(({ path, method, body }) => {
    if (path === "/pulls" && method === "POST") {
      branch = body.head_branch;
      return { pr_number: 7 };
    }
    if (path === "/publish") {
      if (++saves === 1)
        return Response.json({ detail: "Save rejected" }, { status: 403 });
      assert.equal(body.target_branch, branch);
      head = "saved";
      return { pr_number: 7, branch, commit_sha: head };
    }
    return { ...pr, head_branch: branch, head_sha: head };
  });
  const attempt = {};
  await assert.rejects(publishChatFiles(context, bundle, attempt), {
    status: 403,
  });
  assert.equal(attempt.requested, true);
  assert.equal(
    (await publishChatFiles(context, bundle, attempt)).commitSha,
    "saved",
  );
  assert.deepEqual(
    log.filter(({ method }) => method === "POST").map(({ path }) => path),
    ["/pulls", "/publish", "/publish"],
  );
});

test("an uncertain existing-session chat save reconciles against exact files without another write", async () => {
  let committed = false;
  const { context, log } = await fixture(({ path, query }) => {
    if (path === "/publish") {
      committed = true;
      return Response.json({ detail: "Connection lost" }, { status: 502 });
    }
    if (path === "/file") {
      assert.equal(query.get("ref"), "saved");
      const text = draft.staged_files[query.get("path")];
      return {
        encoding: "base64",
        content: Base64.encode(
          typeof text === "string"
            ? text
            : JSON.stringify(text, null, 2) + "\n",
        ),
      };
    }
    return { ...pr, head_sha: committed ? "saved" : "old-head" };
  });
  const session = await sessionDetails(context, 7);
  const attempt = {};
  await assert.rejects(publishChatFiles(context, bundle, attempt, session), {
    status: 502,
  });
  await assert.rejects(
    publishChatFiles(context, bundle, attempt, { ...session, number: 8 }),
    /original session/,
  );
  assert.equal(
    (await publishChatFiles(context, bundle, attempt, session)).commitSha,
    "saved",
  );
  assert.equal(log.filter((call) => call.path === "/publish").length, 1);
});

test("a broker simulation is never treated as a real publish", async () => {
  const { context, log } = await fixture(() => ({
    mode: "sandbox_dry_run",
    status: "published",
  }));
  await assert.rejects(publishChatFiles(context, bundle), {
    code: "BROKER_DRY_RUN",
  });
  assert.deepEqual(
    log.map(({ path }) => path),
    ["/repo", "/pulls"],
  );
});
