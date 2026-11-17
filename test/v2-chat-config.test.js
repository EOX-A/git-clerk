import assert from "node:assert/strict";
import test from "node:test";
import {
  getChatConfig,
  chatScopeKey,
  chatContextIncludes,
  chatContextContent,
} from "../src2/helpers/chat-config.js";
import { streamChat } from "../src2/api/agentic.js";
import { publishGitBundle } from "../src2/api/git-broker.js";
import {
  buildChatPrompt,
  buildChatHistory,
  parseChatReply,
} from "../src2/helpers/chat-request.js";
import { createChatConversation } from "../src2/helpers/chat-conversation.js";
import { fileConfiguration } from "../src2/helpers/file-editor.js";
import exampleChatConfig from "./example-chat-config.js";

const configured = (chat) => getChatConfig({ gitClerkConfig: { chat } });
const install = (t, chat) => {
  const original = globalThis.gitClerkConfig;
  globalThis.gitClerkConfig = { chat };
  t.after(() => {
    globalThis.gitClerkConfig = original;
  });
};
const frame = (event, data) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const response = (reply) =>
  new Response(
    frame("STATE_DELTA", reply) + frame("RUN_FINISHED", { status: "success" }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
const draft = { title: "Story", files: { "stories/sample.md": "# A story\n" } };

test("project IDs do not select application behaviour or implicit schemas", () => {
  const baseline = configured({});
  assert.equal(baseline.preset.projectId, undefined);
  assert.equal(baseline.preset.ui.sessionTitle, "New session");
  assert.equal(baseline.preset.automations, undefined);
  assert.equal(baseline.preset.schemaMap, undefined);
  for (const projectId of [
    "earthcode-osc",
    "generic-eox",
    "new-custom-project",
  ]) {
    const config = configured({ preset: { projectId } });
    assert.equal(
      buildChatPrompt("Create a sample", config),
      buildChatPrompt("Create a sample", baseline),
    );
    assert.deepEqual(config.preset.context, baseline.preset.context);
    assert.deepEqual(config.preset.ui, baseline.preset.ui);
    assert.equal(
      fileConfiguration("products/sample/collection.json", {
        gitClerkConfig: { chat: { preset: { projectId } } },
      }).meta,
      null,
    );
  }
});

test("replacing the OSC example preset removes all implicit OSC behaviour", () => {
  const chat = structuredClone(exampleChatConfig);
  const osc = configured(chat);
  assert.match(buildChatPrompt("Create a sample", osc), /STAC\/OSC/);
  assert.match(buildChatPrompt("Create a sample", osc), /relative\/path\.json/);
  assert.equal(chatContextIncludes("data.json", osc), true);
  assert.equal(chatContextIncludes("story.md", osc), false);
  assert.match(osc.publishing.prBody, /OSC/);
  chat.preset = {
    projectId: "custom-docs",
    promptInstructions: "Write complete technical documentation",
    fileExample: { "docs/example.md": "complete file text" },
    context: { extensions: [".md"] },
    ui: { sessionTitle: "New guide", generating: "Writing guide…" },
  };
  const docs = configured(chat);
  assert.doesNotMatch(
    JSON.stringify(docs),
    /OSC|STAC|earthcode|collection\.json/,
  );
  assert.equal(docs.preset.ui.sessionTitle, "New guide");
  assert.equal(chatContextIncludes("story.md", docs), true);
  assert.equal(chatContextIncludes("data.json", docs), false);
  const root = {
    gitClerkConfig: {
      chat,
      schemaMap: [
        {
          path: "/docs/<name>.md",
          schema: { type: "object" },
          output: "markdown",
          preview: "/docs-preview.html",
        },
      ],
    },
  };
  assert.equal(
    fileConfiguration("products/sample/collection.json", root).meta,
    null,
  );
  assert.equal(
    fileConfiguration("docs/guide.md", root).meta.preview,
    "/docs-preview.html",
  );
  assert.equal(fileConfiguration("docs/guideXmd", root).meta, null);
});

test("one preset controls project, format and UI while streaming defaults true", () => {
  const root = {
    gitClerkConfig: {
      ghConfig: { githubRepo: "alice/repo" },
      chat: {
        backend: { baseUrl: "https://agent.example/api-root/" },
        preset: {
          projectId: "gtif-at",
          output_format: "text",
          ui: { heading: "GTIF", description: "Austria" },
        },
      },
    },
  };
  const before = structuredClone(root);
  const config = getChatConfig(root);
  assert.equal(config.backend.baseUrl, "https://agent.example/api-root");
  assert.equal(config.backend.stream, true);
  assert.equal(config.preset.projectId, "gtif-at");
  assert.equal(config.preset.output_format, "text");
  assert.equal(config.preset.ui.heading, "GTIF");
  assert.equal(config.preset.ui.description, "Austria");
  assert.doesNotMatch(config.preset.promptInstructions, /OSC/);
  assert.deepEqual(root, before);
  assert.equal(config.features.modelSelector, false);
  assert.equal(config.publishing.automatic, true);
});

test("narrative context and prompts preserve Markdown instead of requiring OSC JSON", () => {
  const config = configured({
    preset: {
      promptInstructions: "Complete narrative Markdown files",
      context: { extensions: [".md", ".mdx"] },
    },
  });
  assert.equal(chatContextIncludes("stories/sample.md", config), true);
  assert.equal(chatContextIncludes("products/sample.json", config), false);
  assert.equal(
    chatContextContent("# Story\n", "stories/sample.md"),
    "# Story\n",
  );
  assert.deepEqual(chatContextContent('{"id":"sample"}', "data.json"), {
    id: "sample",
  });
  assert.equal(chatContextContent("unfinished", "data.json"), "unfinished");
  assert.doesNotMatch(buildChatPrompt("Edit the story", config), /OSC|STAC/);
  assert.match(buildChatPrompt("Edit the story", config), /complete file text/);
  assert.match(buildChatHistory([], draft, config)[0].content, /# A story/);
  assert.equal(
    chatContextIncludes("notes.txt", configured({ preset: {} })),
    true,
  );
  assert.equal(
    fileConfiguration("products/sample/collection.json", {
      gitClerkConfig: {
        chat: {
          preset: {
            promptInstructions: "Complete narrative Markdown files",
            context: { extensions: [".md", ".mdx"] },
          },
        },
      },
    }).meta,
    null,
  );
});

test("chat identity is isolated by backend, project and output behaviour", () => {
  const baseline = configured({});
  for (const chat of [
    { backend: { baseUrl: "https://other.test" } },
    { preset: { projectId: "gtif-at" } },
    { preset: { profile: "markdown_editor" } },
    { preset: { output_format: "json" } },
    {
      preset: {
        promptInstructions: "Complete narrative Markdown files",
        context: { extensions: [".md", ".mdx"] },
      },
    },
  ])
    assert.notEqual(chatScopeKey(configured(chat)), chatScopeKey(baseline));
});

test("generation uses config baseUrl, project, profile, output_format and selected model", async (t) => {
  install(t, {
    backend: { baseUrl: "https://agent.test/" },
    preset: {
      projectId: "gtif-at",
      profile: "chat",
      output_format: "text",
    },
  });
  const mock = t.mock.method(globalThis, "fetch", async () =>
    response({ message: JSON.stringify({ message: "Ready", draft }) }),
  );
  const result = await streamChat(
    { prompt: "Write a story", model: "gemini" },
    () => {},
  );
  assert.deepEqual(result.draft, draft);
  const [url, options] = mock.mock.calls[0].arguments;
  assert.equal(url, "https://agent.test/api/generate");
  const body = JSON.parse(options.body);
  assert.equal(body.project_id, "gtif-at");
  assert.equal(body.profile, "chat");
  assert.equal(body.output_format, "text");
  assert.equal(body.stream, true);
  assert.equal(body.model, "gemini");
});

test("stream false consumes the backend JSON envelope and raw Markdown can target an explicit file", async (t) => {
  install(t, {
    backend: { baseUrl: "/agentic", stream: false },
    preset: {
      projectId: "generic-eox",
      profile: "markdown_editor",
      output_format: "markdown",
      outputFile: "stories/sample.md",
      context: { inputField: "markdown" },
    },
  });
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ markdown: "# Updated story\n" }),
  );
  const result = await streamChat(
    { prompt: "Improve the introduction", draft },
    () => {},
  );
  assert.equal(result.draft.files["stories/sample.md"], "# Updated story\n");
  const [url, options] = mock.mock.calls[0].arguments;
  assert.equal(url, "/agentic/api/generate");
  assert.equal(options.headers.Accept, "application/json");
  const body = JSON.parse(options.body);
  assert.equal(body.stream, false);
  assert.equal(body.profile, "markdown_editor");
  assert.equal(body.markdown, draft.files["stories/sample.md"]);
  mock.mock.mockImplementation(async () =>
    Response.json({ detail: "Invalid profile" }, { status: 422 }),
  );
  await assert.rejects(
    streamChat({ prompt: "Try" }, () => {}),
    /Invalid profile/,
  );
});

test("raw output is not published without an explicit destination and errors never become files", () => {
  assert.deepEqual(
    parseChatReply(
      { markdown: "# Story" },
      configured({
        preset: {
          promptInstructions: "Complete narrative Markdown files",
          context: { extensions: [".md", ".mdx"] },
        },
      }),
    ),
    { message: "# Story", draft: null },
  );
  const config = configured({ preset: { outputFile: "story.md" } });
  for (const payload of [
    { error: "Failed" },
    { status: "refused", message: "No" },
    { markdown: "[Error: failed]" },
    { data: null, raw_text: "" },
  ])
    assert.equal(parseChatReply(payload, config), null);
});

test("publishing uses the same backend and configurable broker names", async (t) => {
  install(t, {
    backend: { baseUrl: "/gateway" },
    publishing: {
      serverId: "custom-broker",
      toolName: "publish",
      prBody: "Story changes",
    },
  });
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      status: "published",
      mode: "github_live",
      provider: "github",
      repo: "alice/repo",
      branch: "story",
      commit_sha: "a".repeat(40),
      pr_number: 7,
      pr_url: "https://github.com/alice/repo/pull/7",
    }),
  );
  await publishGitBundle({
    repo: "alice/repo",
    baseBranch: "main",
    targetBranch: "story",
    title: "Story",
    files: draft.files,
    token: "test-token",
  });
  const [url, options] = mock.mock.calls[0].arguments;
  const body = JSON.parse(options.body);
  assert.equal(url, "/gateway/api/mcp/call");
  assert.equal(body.server_id, "custom-broker");
  assert.equal(body.tool_name, "publish");
  assert.equal(body.arguments.pr_body, "Story changes");
});

const tick = () => new Promise((resolve) => setImmediate(resolve));
test("automatic false keeps a reviewable draft until explicit publishing", async () => {
  let writes = 0;
  const chat = createChatConversation({
    config: configured({ publishing: { automatic: false } }),
    connect: async () => {},
    generate: async () => ({ message: "Ready", draft }),
    prepare: async (draft) => ({ draft, staged_files: draft.files }),
    publish: async () => {
      writes++;
      return { session: { number: 7 }, commitSha: "saved", files: [] };
    },
    onSaved: () => {},
  });
  chat.sendMethod({ text: "Write a story" });
  await tick();
  assert.equal(writes, 0);
  assert.deepEqual(chat.state.pending, draft);
  chat.retryMethod();
  await tick();
  assert.equal(writes, 1);
});

test("disabled publishing and disabled chat cannot trigger Git writes", async () => {
  let writes = 0;
  for (const config of [
    configured({ publishing: { enabled: false } }),
    configured({ enabled: false }),
  ]) {
    const chat = createChatConversation({
      config,
      connect: async () => {},
      generate: async () => ({ message: "Ready", draft }),
      prepare: async () => ({}),
      publish: async () => {
        writes++;
      },
      onSaved: () => {},
    });
    chat.sendMethod({ text: "Create" });
    await tick();
    chat.retryMethod();
    await tick();
  }
  assert.equal(writes, 0);
});
