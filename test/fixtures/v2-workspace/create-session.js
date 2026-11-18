import { Base64 } from "js-base64";
import useGitStore from "../../../src2/stores/git.js";
import { gitBlobSha } from "../../../src2/helpers/file-publication.js";

// Exercise the real v2 stores, dialogs and chat without provider credentials or writes.
export default function installCreationFixture({ chat = false } = {}) {
  const slowFiles = new URLSearchParams(window.location.search).has(
    "slowfiles",
  );
  const user = {
    name: "Alice",
    email: "alice@example.test",
    username: "alice",
  };
  const repository = {
    provider: "github",
    repo: "upstream/catalog",
    default_branch: "main",
    html_url: "https://github.com/upstream/catalog",
  };
  const prs = new Map();
  const documents = new Map();
  let commits = 0;
  function create(number, title, branch, draft, body = "") {
    const pr = {
      number,
      title,
      body,
      repo: repository.repo,
      state: "open",
      draft,
      html_url: `${repository.html_url}/pull/${number}`,
      head_branch: branch,
      head_sha: `initial-${number}`,
      base_branch: "main",
      author: "git-broker",
      updated_at: new Date().toISOString(),
      ci_status: "success",
    };
    prs.set(number, pr);
    documents.set(number, new Map());
    return pr;
  }
  if (chat) {
    create(7, "Chat workspace demo", "session/alice/chat", true);
    create(8, "Other session demo", "session/alice/other", true);
    documents.get(7).set("README.md", "# Fixture repository\n");
  }
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
      ...globalThis.gitClerkConfig.schemaMap.filter(
        (entry) => entry.schema && entry.path.startsWith("/stories/"),
      ),
    ],
  );

  const store = useGitStore();
  Object.assign(store.user, user);
  store.setContext({
    repository,
    user,
    async request(path, { method = "GET", query, body } = {}) {
      const match = /^\/pulls\/(\d+)(?:\/(\w+))?$/.exec(path);
      const number = Number(match?.[1]);
      if (path === "/pulls") {
        if (method === "POST")
          return create(
            Math.max(6, ...prs.keys()) + 1,
            body.title,
            body.head_branch,
            body.draft,
            body.body,
          );
        return { pull_requests: [...prs.values()] };
      }
      if (path === "/publish") {
        const pr = [...prs.values()].find(
          (item) => item.head_branch === body.target_branch,
        );
        if (!pr) throw new Error("Create a draft PR before publishing files.");
        const files = documents.get(pr.number);
        const files_committed = [];
        for (const [path, text] of Object.entries(body.files)) {
          files.set(path, text);
          files_committed.push({ path, sha: await gitBlobSha(text) });
        }
        pr.head_sha = `generated-${++commits}`;
        pr.updated_at = new Date().toISOString();
        return {
          pr_number: pr.number,
          branch: pr.head_branch,
          commit_sha: pr.head_sha,
          files_committed,
        };
      }
      if (path === "/file" || path === "/tree") {
        const pr = [...prs.values()].find((item) =>
          [item.head_sha, item.head_branch].includes(query.ref),
        );
        const files = documents.get(pr?.number) || new Map();
        if (path === "/file") {
          const text = files.get(query.path);
          if (slowFiles)
            await new Promise((resolve) => setTimeout(resolve, 2000));
          if (text === undefined)
            throw Object.assign(new Error("Fixture file not found"), {
              status: 404,
            });
          return {
            path: query.path,
            encoding: "base64",
            content: Base64.encode(text),
            size: text.length,
            sha: await gitBlobSha(text),
          };
        }
        const prefix = query.path ? `${query.path}/` : "";
        const entries = new Map();
        for (const file of files.keys()) {
          if (!file.startsWith(prefix)) continue;
          const [name, ...children] = file.slice(prefix.length).split("/");
          entries.set(name, {
            name,
            path: `${prefix}${name}`,
            type: children.length ? "dir" : "file",
          });
        }
        return { entries: [...entries.values()] };
      }
      const pr = prs.get(number);
      if (!pr)
        throw Object.assign(new Error("Session not found"), { status: 404 });
      if (match[2] === "rename") pr.title = body.title;
      if (match[2] === "submit") pr.draft = false;
      if (match[2] === "state") pr.state = body.state;
      if (method === "DELETE") pr.state = "closed";
      if (match[2] === "diff") return { patch: "@@ -1 +1 @@\n-old\n+new" };
      if (match[2] === "files")
        return {
          files: [...documents.get(number).keys()].map((filename) => ({
            filename,
            status: "added",
            additions: 1,
            deletions: 0,
          })),
        };
      return { ...pr, changed_files: documents.get(number).size };
    },
  });
  return {
    toggleClosed: () => {
      const pr = prs.get(7);
      pr.state = pr.state === "closed" ? "open" : "closed";
    },
  };
}
