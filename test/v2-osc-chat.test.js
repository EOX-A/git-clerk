import {
  buildOscPrompt,
  buildOscHistory,
  parseOscReply,
} from "../src2/helpers/osc-request.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
  readEventStream,
  streamedMessage,
} from "../src2/helpers/event-stream.js";
import { streamOscChat } from "../src2/api/agentic.js";
import { createOscConversation } from "../src2/helpers/osc-conversation.js";
import { checkOscFiles, mergeOscFile } from "../src2/api/osc-files.js";

const frame = (event, data) =>
  `event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
function responseFor(text, fragment = 3) {
  const encoded = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < encoded.length; i += fragment)
          controller.enqueue(encoded.slice(i, i + fragment));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
const draft = {
  title: "Sample OSC",
  files: {
    "products/sample/collection.json": {
      type: "Collection",
      id: "sample",
      links: [],
    },
  },
};
const bundle = {
  draft,
  staged_files: draft.files,
  validation: { valid: true },
};
const session = {
  number: 7,
  headOwner: "alice",
  headRepo: "catalog",
  branch: "alice/osc",
  headSha: "base",
  canEdit: true,
  status: "draft",
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("SSE preserves split UTF-8, CRLF, multiline data and frame boundaries", async () => {
  const events = [];
  await readEventStream(
    responseFor(frame("TEXT_MESSAGE_CONTENT", { chunk: "Earth 🌍" }), 1),
    (...event) => events.push(event),
  );
  assert.deepEqual(events, [["TEXT_MESSAGE_CONTENT", { chunk: "Earth 🌍" }]]);
  assert.equal(
    streamedMessage('{"message":"Line\\nEarth \\u263a'),
    "Line\nEarth ☺",
  );
  assert.equal(streamedMessage('{"message":"incomplete \\u26'), "incomplete ");
  assert.equal(
    streamedMessage('{"message":"Done", "draft":{"private":"hidden"}}'),
    "Done",
  );
  await assert.rejects(
    readEventStream(responseFor("event: STATE_DELTA\ndata: {}"), () => {}),
    /ended/,
  );
});

test("OSC stream uses existing chat profile, includes context, and rejects hidden backend errors", async (t) => {
  const body =
    frame("TEXT_MESSAGE_CONTENT", { chunk: '{"message":"Working"}' }) +
    frame("STATE_DELTA", {
      message: JSON.stringify({ message: "Done", draft }),
      components: [],
    }) +
    frame("RUN_FINISHED", { status: "success" });
  const mock = t.mock.method(globalThis, "fetch", async () =>
    responseFor(body),
  );
  const events = [];
  const result = await streamOscChat(
    {
      prompt: "Generate sample OSC",
      history: [{ role: "user", content: "Previous" }],
      draft,
    },
    (...event) => events.push(event),
  );
  assert.deepEqual(result.draft, draft);
  const request = JSON.parse(mock.mock.calls[0].arguments[1].body);
  assert.equal(request.profile, "chat");
  assert.equal(request.project_id, "earthcode-osc");
  assert.equal(request.stream, true);
  assert.equal(request.output_format, "text_and_a2ui");
  assert.ok(Array.from(request.prompt).length <= 400);
  assert.doesNotMatch(request.prompt, /Previous/);
  assert.equal(request.history[0].content, "Previous");
  assert.match(request.history.at(-1).content, /Current OSC draft/);
  assert.equal(events.length, 3);
  mock.mock.mockImplementation(async () =>
    responseFor(
      frame("TEXT_MESSAGE_CONTENT", { chunk: "\n[Exception: missing tool]" }) +
        body,
    ),
  );
  await assert.rejects(
    streamOscChat({ prompt: "Retry" }, () => {}),
    /generation failed/,
  );
  mock.mock.mockImplementation(async () =>
    responseFor(
      frame("STATE_DELTA", { data: null }) +
        frame("RUN_FINISHED", { status: "success" }),
    ),
  );
  await assert.rejects(
    streamOscChat({ prompt: "Retry" }, () => {}),
    /complete draft/,
  );
  mock.mock.mockImplementation(async () =>
    responseFor(frame("STATE_DELTA", { data: { message: "Partial", draft } })),
  );
  await assert.rejects(
    streamOscChat({ prompt: "Retry" }, () => {}),
    /complete draft/,
  );
});

function conversationFixture(overrides = {}) {
  const calls = [];
  const conversation = createOscConversation({
    connect: async () => {},
    generate: async (_input, event) => {
      calls.push("generate");
      event("TEXT_MESSAGE_CONTENT", { chunk: '{"message":"Streaming reply"' });
      return { message: "Draft ready", draft };
    },
    prepare: async () => {
      calls.push("prepare");
      return bundle;
    },
    publish: async () => {
      calls.push("publish");
      return {
        session,
        commitSha: "saved",
        files: [{ path: "products/sample/collection.json", status: "Added" }],
      };
    },
    onSaved: () => calls.push("saved"),
    ...overrides,
  });
  return { ...conversation, calls };
}

test("new chat streams, prepares, publishes through the broker and retains its conversation", async () => {
  const chat = conversationFixture();
  assert.equal(chat.sendMethod({ text: "Create OSC sample" }), true);
  assert.equal(chat.sendMethod({ text: "Duplicate" }), false);
  await tick();
  assert.deepEqual(chat.calls, ["generate", "prepare", "publish", "saved"]);
  assert.equal(chat.state.session.number, 7);
  assert.equal(chat.state.completed, 1);
  assert.equal(chat.state.messages[1].text, "Draft ready");
  assert.equal(chat.state.messages.at(-1).files.length, 1);
  assert.equal(chat.state.messages.at(-1).fileStage, "saved");
  assert.equal(chat.state.messages.at(-1).pr.number, 7);
  assert.equal(chat.state.messages.at(-1).pr.updated, false);
  assert.deepEqual(
    chat.state.messages.at(-1).files[0].content,
    draft.files["products/sample/collection.json"],
  );
  assert.equal(chat.state.busy, false);
});

test("failed save retries the same draft and PR without repeating generation", async () => {
  let writes = 0;
  const chat = conversationFixture({
    publish: async (_bundle, attempt) => {
      if (++writes === 1) {
        attempt.requested = true;
        throw new Error("Disconnected");
      }
      assert.equal(attempt.requested, true);
      return { session, commitSha: "saved", files: [] };
    },
  });
  chat.sendMethod({ text: "Generate" });
  await tick();
  assert.ok(chat.state.pending);
  assert.match(chat.state.error, /Disconnected/);
  assert.equal(chat.state.messages[1].fileStage, "failed");
  assert.equal(chat.state.messages[1].files[0].status, "Generated");
  assert.ok(!chat.state.messages.some((message) => message.pr));
  chat.retryMethod();
  await tick();
  assert.equal(chat.calls.filter((call) => call === "generate").length, 1);
  assert.equal(writes, 2);
  assert.equal(chat.state.completed, 1);
});
test("a follow-up publishes into the same PR and keeps both turns in chat", async () => {
  let writes = 0;
  const targets = [];
  const chat = conversationFixture({
    loadDraft: async () => draft,
    publish: async (_bundle, _attempt, target) => {
      targets.push(target);
      if (target) assert.match(chat.state.progress, /Updating files in PR #7/);
      return {
        session,
        commitSha: `saved-${++writes}`,
        files: [{ path: "products/sample/collection.json", status: "Saved" }],
      };
    },
  });
  chat.sendMethod({ text: "Create OSC sample" });
  await tick();
  const initial = chat.state.session;
  chat.sendMethod({ text: "Update the description" }, initial);
  await tick();
  assert.equal(targets[0], null);
  assert.equal(targets[1].number, 7);
  assert.equal(targets[1].headSha, "saved-1");
  assert.equal(chat.state.session.number, 7);
  assert.equal(chat.state.session.headSha, "saved-2");
  assert.equal(chat.state.messages.at(-1).pr.updated, true);
  assert.equal(chat.state.completed, 2);
  assert.equal(
    chat.state.messages.filter((message) => message.role === "user").length,
    2,
  );
  assert.equal(chat.state.messages.at(-1).pr.number, 7);
  assert.equal(chat.state.error, "");
});

test("streamed file cards stay unsaved until publication is confirmed", async () => {
  let finish;
  const chat = conversationFixture({
    generate: async (_input, event) => {
      const text = JSON.stringify({ message: "Draft ready", draft });
      for (let i = 0; i < text.length; i += 7)
        event("TEXT_MESSAGE_CONTENT", { chunk: text.slice(i, i + 7) });
      return { message: "Draft ready", draft };
    },
    publish: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  chat.sendMethod({ text: "Create sample" });
  await tick();
  assert.equal(chat.state.messages[1].fileStage, "publishing");
  assert.equal(chat.state.messages[1].files[0].status, "Generated");
  assert.ok(!chat.state.messages.some((message) => message.pr));
  finish({
    session,
    commitSha: "saved",
    files: [{ path: "products/sample/collection.json", status: "Saved" }],
  });
  await tick();
  assert.equal(chat.state.messages.at(-1).fileStage, "saved");
  assert.equal(chat.state.messages.at(-1).pr.number, 7);
  assert.deepEqual(chat.state.messages[1].files, []);
});

test("clarifications, invalid drafts, cancellation and closed sessions never publish", async () => {
  const question = conversationFixture({
    generate: async () => ({ message: "Which region?", draft: null }),
  });
  question.sendMethod({ text: "Create data" });
  await tick();
  assert.deepEqual(question.calls, []);
  assert.equal(question.state.messages.at(-1).text, "Which region?");
  const invalid = conversationFixture({
    prepare: async () => {
      throw new Error("Invalid metadata");
    },
  });
  invalid.sendMethod({ text: "Create data" });
  await tick();
  assert.deepEqual(invalid.calls, ["generate"]);
  let finish;
  const stopped = conversationFixture({
    generate: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  stopped.sendMethod({ text: "Generate" });
  await tick();
  stopped.cancelMethod();
  finish({ message: "Late response", draft });
  await tick();
  assert.equal(stopped.state.completed, 0);
  assert.deepEqual(stopped.calls, []);
  assert.equal(
    stopped.sendMethod({ text: "Blocked" }, { ...session, canEdit: false }),
    false,
  );
});

test("publishing rejects only malformed or non-relative file addressing", () => {
  for (const path of [
    "../eo-missions/Sentinel-1/catalog.json",
    "eo-missions/../catalog.json",
    "/eo-missions/Sentinel-1/catalog.json",
    "",
    "products//catalog.json",
    "products/./catalog.json",
    "products\\sample.json",
    "products/invalid\0.json",
  ]) {
    assert.throws(
      () => checkOscFiles({ ...bundle, staged_files: { [path]: {} } }),
      (error) =>
        error.code === "OSC_SAVE" &&
        error.message.includes(JSON.stringify(path)),
    );
  }
  for (const files of [null, [], "{}", 42, {}])
    assert.throws(() => checkOscFiles({ staged_files: files }));
});
test("OSC names, folders, file types and content are not validated in the frontend", () => {
  const files = {
    "variables/Snow cover/catalog.json": { id: "Snow cover" },
    "products/Sea_surface_temperature (test)/collection.json": [],
    "themes/Climat 🌍/catalog.json": null,
    "experiments/nested/sample/record.json": { arbitrary: true },
    "notes/README.md": "Sample notes\n",
    "data/value.json": 42,
    "eo-missions/Sentinel-1/catalog.json.bak": {},
  };
  assert.deepEqual(
    checkOscFiles({ staged_files: files }),
    Object.entries(files),
  );
  const many = Object.fromEntries(
    Array.from({ length: 101 }, (_, i) => [`products/${i}.json`, {}]),
  );
  assert.equal(checkOscFiles({ staged_files: many }).length, 101);
  assert.equal(
    checkOscFiles({
      staged_files: { "data/large.json": "x".repeat(1024 * 1024 + 1) },
    }).length,
    1,
  );
});

test("catalogue merging preserves existing metadata and links, deduplicating relative links", () => {
  const current = {
    title: "Existing",
    links: [{ rel: "child", href: "./older/collection.json", title: "Keep" }],
  };
  const generated = {
    title: "AI title",
    links: [
      { rel: "child", href: "older/collection.json" },
      { rel: "child", href: "./new/collection.json" },
    ],
  };
  const merged = mergeOscFile("products/catalog.json", current, generated);
  assert.equal(merged.title, "Existing");
  assert.equal(merged.links.length, 2);
  assert.equal(merged.links[0].title, "Keep");
  assert.equal(current.links.length, 1);
});

test("follow-up chat uses freshly read PR files instead of overwriting saved manual edits", async () => {
  const fresh = {
    title: "Current PR",
    files: {
      "products/sample/collection.json": {
        id: "sample",
        description: "Manually edited on the branch",
      },
    },
  };
  let received;
  const chat = conversationFixture({
    loadDraft: async () => fresh,
    generate: async (input) => {
      received = input;
      return { message: "I see the current metadata.", draft: null };
    },
  });
  chat.state.draft = { title: "Stale", files: {} };
  chat.sendMethod({ text: "What changed?" }, session);
  await tick();
  assert.deepEqual(received.draft, fresh);
  assert.deepEqual(chat.state.savedFiles, Object.keys(fresh.files));
  assert.equal(chat.calls.includes("publish"), false);
});

test("the reported OSC request fits the backend perimeter even with large history and drafts", () => {
  const message =
    "Add a new product, project and session in any topic you feel like";
  const prompt = buildOscPrompt(message);
  assert.ok(Array.from(prompt).length <= 400);
  assert.ok(prompt.endsWith(message));
  const history = buildOscHistory(
    [{ role: "assistant", content: "Long conversation ".repeat(200) }],
    {
      title: "Existing",
      files: {
        "products/example/collection.json": {
          description: "large metadata ".repeat(1000),
        },
      },
    },
  );
  assert.equal(history.length, 2);
  assert.ok(history.at(-1).content.length > 400);
  assert.equal(buildOscPrompt(message), prompt);
  const capacity = 400 - Array.from(buildOscPrompt("x")).length + 1;
  assert.equal(Array.from(buildOscPrompt("🌍".repeat(capacity))).length, 400);
  assert.throws(
    () => buildOscPrompt("🌍".repeat(capacity + 1)),
    /400 characters/,
  );
  assert.ok(
    buildOscPrompt("Inspect https://example.org/" + "a".repeat(500)).length >
      400,
  );
  assert.throws(
    () => buildOscPrompt("Inspect https://example.org/" + "a".repeat(1000)),
    /1000 characters/,
  );
  assert.throws(() => buildOscPrompt("   "), /Enter a message/);
});

test("overlong composer messages are retained and cannot start generation or saving", () => {
  const chat = conversationFixture();
  assert.equal(chat.sendMethod({ text: "x".repeat(401) }), false);
  assert.match(chat.state.error, /backend limits prompt/);
  assert.equal(chat.state.busy, false);
  assert.equal(chat.state.messages.length, 0);
  assert.deepEqual(chat.calls, []);
});

test("HTTP validation errors explain the backend refusal; non-JSON errors still show status", async () => {
  await assert.rejects(
    readEventStream(
      new Response(
        JSON.stringify({
          detail: "Prompt exceeds maximum allowed length of 400 characters.",
        }),
        { status: 400 },
      ),
      () => {},
    ),
    /HTTP 400.*maximum allowed length/,
  );
  await assert.rejects(
    readEventStream(new Response("Bad gateway", { status: 502 }), () => {}),
    /HTTP 502/,
  );
  await assert.rejects(
    readEventStream(new Response("Not JSON", { status: 400 }), () => {}),
    /HTTP 400/,
  );
});

test("chat profile replies support JSON drafts, fenced JSON and plain clarification text", () => {
  const result = { message: "Ready", draft };
  assert.deepEqual(parseOscReply({ message: JSON.stringify(result) }), result);
  assert.deepEqual(
    parseOscReply({ message: JSON.stringify(result) + "\nSources: reference" }),
    result,
  );
  assert.deepEqual(
    parseOscReply({ message: "```json\n" + JSON.stringify(result) + "\n```" }),
    result,
  );
  assert.deepEqual(
    parseOscReply({
      message: "Which region should the product cover?",
      components: [],
    }),
    { message: "Which region should the product cover?", draft: null },
  );
  assert.equal(
    parseOscReply({ message: '{"message":"Partial", "draft":' }),
    null,
  );
  assert.equal(parseOscReply({ data: null, raw_text: "" }), null);
});
