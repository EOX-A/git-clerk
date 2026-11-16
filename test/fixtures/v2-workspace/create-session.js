import useOctokitStore from "../../../src2/stores/octokit.js";

// Exercise the real root, dialog, store and redirect without credentials or GitHub writes.
export default function installCreationFixture() {
  const branches = new Map([["main", "base"]]);
  let pr = null;
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
      headRepositoryOwner: { login: "alice" },
      headRefName: pr.head.ref,
      headRefOid: "initial",
      baseRefOid: "base",
      headRef: branches.has(pr.head.ref) ? { id: "REF_7" } : null,
      changedFiles: 0,
      viewerCanUpdate: true,
      headRepository: {
        name: "catalog",
        owner: { login: "alice" },
        viewerPermission: "WRITE",
        defaultBranchRef: { name: "main" },
      },
    };
  useOctokitStore().setOctokit({
    githubConfig: { username: "upstream", repo: "catalog" },
    githubUserData: user,
    scopeOwners: ["alice"],
    octokit: {
      graphql: async (query) => ({
        repository: query.includes("pullRequests(")
          ? {
              pullRequests: {
                nodes: pr ? [graphqlPR()] : [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            }
          : { pullRequest: graphqlPR() },
      }),
      rest: {
        repos: {
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
              owner === "upstream" ? "base" : branches.get(ref.slice(6));
            if (!sha)
              throw Object.assign(new Error("Fixture branch missing"), {
                status: 404,
              });
            return { data: { object: { sha } } };
          },
          getCommit: async () => ({ data: { tree: { sha: "tree" } } }),
          createCommit: async () => ({ data: { sha: "initial" } }),
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
          listFiles: async () => ({ data: [], headers: {} }),
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
}
