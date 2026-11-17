import useOctokitStore from "../../../src2/stores/octokit.js";

// Exercise the real root, dialog, store and redirect without credentials or GitHub writes.
export default function installCreationFixture({ chat = false } = {}) {
  const slowFiles = new URLSearchParams(window.location.search).has(
    "slowfiles",
  );
  const branches = new Map([
    ["main", "base"],
    ["alice/chat", "initial"],
  ]);
  const files = new Map();
  let stagedTree = [];
  let commits = 0;
  globalThis.schemaMap = ["products", "projects", "variables"].flatMap(
    (dir) => [
      {
        path: `/${dir}/<id>/${dir === "variables" ? "catalog" : "collection"}.json`,
        schema: {
          type: "object",
          required: ["type", "id", "links"],
          properties: {
            type: { type: "string" },
            id: { type: "string" },
            links: { type: "array", items: { type: "object" } },
          },
        },
      },
      {
        path: `/${dir}/catalog.json`,
        schema: { type: "object", required: ["type", "id", "links"] },
      },
    ],
  );
  let pr = chat
    ? {
        node_id: "PR_7",
        number: 7,
        title: "Chat workspace demo",
        state: "open",
        draft: true,
        html_url: "https://github.com/upstream/catalog/pull/7",
        updated_at: "initial",
        head: { ref: "alice/chat", repo: { owner: { login: "alice" } } },
      }
    : null;
  const user = { login: "alice", name: "Alice", email: "alice@example.test" };
  const graphqlPR = () =>
    pr && {
      id: pr.node_id,
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state === "closed" ? "CLOSED" : "OPEN",
      isDraft: pr.draft,
      updatedAt: pr.updated_at,
      author: { login: "alice" },
      headRepositoryOwner: { login: pr.head.repo.owner.login },
      headRefName: pr.head.ref,
      headRefOid: branches.get(pr.head.ref),
      baseRefOid: "base",
      baseRefName: pr.base?.ref || "main",
      body: pr.body || "",
      headRef: branches.has(pr.head.ref) ? { id: "REF_7" } : null,
      changedFiles: files.size || (chat ? 1 : 0),
      viewerCanUpdate: true,
      headRepository: {
        name: "catalog",
        owner: { login: pr.head.repo.owner.login },
        viewerPermission: "WRITE",
        defaultBranchRef: { name: "main" },
      },
    };
  useOctokitStore().setOctokit({
    githubTargetRepo: { default_branch: "main" },
    githubConfig: { username: "upstream", repo: "catalog" },
    githubUserData: user,
    scopeOwners: null,
    octokit: {
      auth: async () => ({ token: "fixture-token" }),
      graphql: async (query, variables) => ({
        repository: query.includes("pullRequests(")
          ? {
              pullRequests: {
                nodes: pr ? [graphqlPR()] : [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            }
          : {
              pullRequest: chat
                ? {
                    ...graphqlPR(),
                    number: variables.number,
                    id: `PR_${variables.number}`,
                  }
                : graphqlPR(),
            },
      }),
      rest: {
        repos: {
          getContent: async ({ path }) => {
            if (slowFiles)
              await new Promise((resolve) => setTimeout(resolve, 3000));
            const content =
              files.get(path) ||
              (path === "README.md" ? "# Fixture document\n" : null);
            if (content === null)
              throw Object.assign(new Error("Fixture file missing"), {
                status: 404,
              });
            return {
              data: {
                type: "file",
                path,
                sha: `file-${commits}`,
                size: content.length,
                encoding: "base64",
                content: btoa(unescape(encodeURIComponent(content))),
              },
            };
          },
          get: async ({ owner }) => ({
            data: {
              id: owner === "upstream" ? 1 : 2,
              name: "catalog",
              owner: { login: owner },
              default_branch: "main",
              fork: owner === "alice",
              parent: { id: 1 },
              permissions: { push: true },
            },
          }),
        },
        git: {
          getRef: async ({ owner, ref }) => {
            const sha =
              owner === "upstream" && ref === "heads/main"
                ? "base"
                : branches.get(ref.slice(6));
            if (!sha)
              throw Object.assign(new Error("Fixture branch missing"), {
                status: 404,
              });
            return { data: { object: { sha } } };
          },
          getCommit: async () => ({ data: { tree: { sha: "tree" } } }),
          createTree: async ({ tree }) => {
            stagedTree = tree;
            return { data: { sha: "generated-tree" } };
          },
          createCommit: async ({ tree }) => ({
            data: {
              sha:
                tree === "generated-tree"
                  ? `generated-${++commits}`
                  : "initial",
            },
          }),
          updateRef: async ({ ref, sha, force }) => {
            if (force) throw new Error("Fixture rejects forced writes");
            branches.set(ref.slice(6), sha);
            for (const file of stagedTree) files.set(file.path, file.content);
            return {};
          },
          createRef: async ({ ref, sha }) => {
            branches.set(ref.slice(11), sha);
            return {};
          },
          deleteRef: async ({ ref }) => {
            branches.delete(ref.slice(6));
            return {};
          },
          getTree: async () => ({
            data: {
              tree: [{ path: "README.md", type: "blob", sha: "readme" }],
              truncated: false,
            },
          }),
        },
        pulls: {
          list: async () => ({ data: pr ? [pr] : [] }),
          listFiles: async () => ({
            data: files.size
              ? [...files.keys()].map((filename) => ({
                  filename,
                  status: "added",
                  additions: 1,
                  deletions: 0,
                }))
              : chat
                ? [
                    {
                      filename: "README.md",
                      status: "modified",
                      additions: 1,
                      deletions: 1,
                      patch: "@@ -1 +1 @@\n-old\n+new",
                    },
                  ]
                : [],
            headers: {},
          }),
          update: async ({ title, state }) => {
            if (pr) {
              if (title) pr.title = title;
              if (state) pr.state = state;
            }
            return { data: pr };
          },
          create: async ({ title, head }) => {
            pr = {
              node_id: "PR_7",
              number: 7,
              title,
              html_url: "https://github.com/upstream/catalog/pull/7",
              state: "open",
              draft: true,
              updated_at: new Date().toISOString(),
              head: {
                ref: head.split(":")[1],
                repo: { owner: { login: "alice" } },
              },
            };
            return { data: pr };
          },
        },
      },
    },
  });
  // Mirror only the local mock gateway's result into the mock GitHub read model.
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (url, options) => {
    const response = await originalFetch(url, options);
    if (url === "/test/agentic/api/mcp/call" && response.ok) {
      const { arguments: args } = JSON.parse(options.body);
      const result = await response.clone().json();
      for (const [path, content] of Object.entries(args.files))
        files.set(path, content);
      branches.set(result.branch, result.commit_sha);
      pr = {
        node_id: "PR_7",
        number: 7,
        title: args.pr_title,
        state: "open",
        draft: args.base_branch === args.target_branch ? pr.draft : false,
        base: {
          ref:
            args.base_branch === args.target_branch
              ? pr.base?.ref || "main"
              : args.base_branch,
        },
        body: args.pr_body,
        html_url: result.pr_url,
        updated_at: new Date().toISOString(),
        head: { ref: result.branch, repo: { owner: { login: "upstream" } } },
      };
    }
    return response;
  };
  return {
    toggleClosed: () => {
      pr.state = pr.state === "closed" ? "open" : "closed";
    },
  };
}
