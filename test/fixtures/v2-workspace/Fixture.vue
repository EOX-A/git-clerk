<script setup>
import { provide, ref } from "vue";
import { Base64 } from "js-base64";
import {
  FileWorkspace,
  FileTabs,
  FileTreePlaceholder,
} from "@/components/file-browser";
import Toast from "@/components/global/Toast.vue";
import useGitStore from "@/stores/git.js";
const loadingPreview = ref(false);
const snackbar = ref(false);
provide("set-snackbar", snackbar);
const preview = "/test/fixtures/v2-workspace/preview.html";
globalThis.gitClerkConfig = {
  schemaMap: [
    {
      path: "/project.json",
      preview,
      schema: {
        title: "Project collection schema",
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string", format: "textarea" },
        },
      },
    },
    {
      path: "/form-only.json",
      schema: {
        title: "Settings",
        type: "object",
        properties: { name: { type: "string" } },
      },
    },
    {
      path: "/story.md",
      preview,
      output: "body",
      schema: {
        type: "object",
        properties: { body: { type: "string", format: "textarea" } },
      },
    },
  ],
};
const texts = {
  "project.json":
    '{\n  "title": "Earth observation",\n  "description": "A live iframe preview"\n}\n',
  "form-only.json": '{"name":"Fixture"}\n',
  "notes.txt": "Plain source file\nSecond line\n",
  "story.md": "# A field guide\n\nMarkdown content.\n",
  "removed.txt": "Previously saved file\n",
};
const changes = Object.keys(texts).map((filename) => ({
  filename,
  status: filename === "removed.txt" ? "removed" : "modified",
  additions: 2,
  deletions: 1,
  patch: "@@ -1 +1,2 @@\n-old\n+new\n+second",
}));
const session = ref({
  number: 7,
  id: "PR_7",
  title: "File workspace fixture",
  url: "https://github.com/fixture/catalog/pull/7",
  status: "draft",
  repo: "catalog",
  owner: "fixture",
  branch: "test",
  headOwner: "fixture",
  headRepo: "catalog",
  headSha: "head",
  baseSha: "base",
  baseBranch: "main",
  repositoryUrl: "https://github.com/fixture/catalog",
  changedFiles: changes.length,
  canEdit: true,
  canManage: true,
  updatedAt: "initial",
});
const saved = ref(0),
  failSave = ref(false),
  dirty = ref(false);
useGitStore().setContext({
  repository: {
    repo: "fixture/catalog",
    default_branch: "main",
    provider: "github",
  },
  user: { username: "fixture", name: "Fixture", email: "fixture@example.test" },
  async request(path, { query, body } = {}) {
    if (path.endsWith("/files")) return { files: changes };
    if (path.endsWith("/diff"))
      return changes.find((change) => change.filename === query.path);
    if (path === "/file") {
      const text = texts[query.path];
      return {
        path: query.path,
        encoding: "base64",
        content: Base64.encode(text),
        size: text.length,
        sha: `blob-${saved.value}`,
      };
    }
    if (path === "/tree")
      return {
        entries: Object.keys(texts)
          .filter((path) => path !== "removed.txt")
          .map((path) => ({ name: path, path, type: "file", sha: path })),
      };
    if (path === "/publish") {
      if (failSave.value)
        throw Object.assign(new Error("Fixture conflict"), { status: 409 });
      Object.assign(texts, body.files);
      saved.value++;
      return {
        commit_sha: `head-${saved.value}`,
        pr_number: 7,
        branch: body.target_branch,
        files_committed: Object.keys(body.files).map((path) => ({
          path,
          sha: `blob-${saved.value}`,
        })),
      };
    }
    throw new Error(`Unexpected fixture path: ${path}`);
  },
});
const refresh = async () => {
  session.value = {
    ...session.value,
    headSha: `head-${saved.value}`,
    updatedAt: `saved-${saved.value}`,
  };
};
</script>
<template>
  <div data-gc="light" class="flex h-dvh flex-col bg-bg text-text">
    <header
      class="flex shrink-0 flex-wrap items-center gap-4 border-b border-border-soft p-3 text-ui"
    >
      <label
        ><input v-model="loadingPreview" type="checkbox" /> Show loading
        placeholders</label
      >
      <strong>File workspace fixture</strong><span>Mock saves: {{ saved }}</span
      ><span>Drafts: {{ dirty ? "yes" : "no" }}</span>
      <button
        @click="
          session = {
            ...session,
            status: session.status === 'closed' ? 'draft' : 'closed',
            canEdit: !session.canEdit,
          }
        "
      >
        Toggle closed
      </button>
      <label
        ><input v-model="failSave" type="checkbox" /> Simulate save
        conflict</label
      >
      <RouterLink to="/test/fixtures/v2-workspace/other">Navigate</RouterLink>
    </header>
    <template v-if="loadingPreview">
      <FileTabs
        :tabs="[]"
        loading
        :change-count="3"
        :on-select="() => {}"
        :on-close="() => {}"
        :on-toggle-drawer="() => {}"
      />
      <div class="flex min-h-0 flex-1">
        <aside
          class="w-drawer shrink-0 border-r border-border-soft bg-ws-nav px-1.5 pt-2"
        >
          <FileTreePlaceholder />
        </aside>
      </div>
    </template>
    <FileWorkspace
      v-else
      :session="session"
      :on-saved="refresh"
      :on-dirty-change="(value) => (dirty = value)"
    />
    <Toast />
  </div>
</template>
