import assert from "node:assert/strict";
import test from "node:test";
import { effectScope, nextTick, ref, toRaw } from "vue";
import {
  clampDockedWidth,
  clampFloatingBounds,
  resizeFloatingBounds,
} from "../src2/helpers/chat-layout.js";
import { getDummyMessages, splitFilePath } from "../src2/helpers/chat-dummy.js";
import { generateChatTest, generateOscTest } from "../src2/api/agentic.js";
import useChatApiTest from "../src2/helpers/use-chat-api-test.js";
import useSessionChat from "../src2/helpers/use-session-chat.js";

test("test intro explains console-only responses without depending on PR numbers", () => {
  assert.deepEqual(
    getDummyMessages({ number: 176 }),
    getDummyMessages({ number: 999 }),
  );
  assert.match(getDummyMessages()[0].text, /browser console/);
  assert.deepEqual(splitFilePath("projects/example/collection.json"), {
    dir: "projects/example/",
    name: "collection.json",
  });
  assert.deepEqual(splitFilePath("README.md"), { dir: "", name: "README.md" });
});

test("floating chat stays in bounds, including short and narrow viewports", () => {
  for (const [width, height] of [
    [1200, 800],
    [900, 300],
    [320, 480],
  ]) {
    for (const rect of [
      { x: -100, y: -100, w: 100, h: 100 },
      { x: 9999, y: 9999, w: 2000, h: 2000 },
    ]) {
      const actual = clampFloatingBounds(rect, width, height);
      assert.ok(actual.x >= 8 && actual.y >= 70);
      assert.ok(actual.x + actual.w <= width - 8);
      assert.ok(actual.y + actual.h <= height - 8);
    }
  }
  assert.equal(clampDockedWidth(800, 1000), 620);
  assert.equal(clampDockedWidth(200, 1000), 320);
});

test("resizing top/left keeps the opposite edges anchored until a viewport boundary", () => {
  const start = { x: 400, y: 150, w: 480, h: 500 };
  const resized = resizeFloatingBounds(start, "tl", 50, 30, 1200, 800);
  assert.equal(resized.x + resized.w, start.x + start.w);
  assert.equal(resized.y + resized.h, start.y + start.h);
  const small = resizeFloatingBounds(start, "tl", 900, 900, 1200, 800);
  assert.equal(small.w, 320);
  assert.equal(small.h, 360);
  assert.equal(small.x + small.w, start.x + start.w);
});

const flushRequest = async () => {
  await new Promise((resolve) => setImmediate(resolve));
};
const setupChat = (t) => {
  const calls = [];
  const request = (text, signal) =>
    new Promise((resolve, reject) => {
      calls.push({ text, signal, resolve, reject });
    });
  const logs = t.mock.method(console, "log", () => {});
  const errors = t.mock.method(console, "error", () => {});
  const scope = effectScope();
  const session = ref({ number: 7, status: "draft" });
  const chat = scope.run(() => useSessionChat(session, request));
  t.after(() => scope.stop());
  return { scope, session, chat, calls, logs, errors, request };
};

test("OSC chat requests an EarthCODE JSON draft and only logs the response", async (t) => {
  const response = {
    data: { id: "test-product" },
    metadata: { isAiGenerated: true },
  };
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(response)),
  );
  const logs = t.mock.method(console, "log", () => {});
  const scope = effectScope();
  t.after(() => scope.stop());
  const chat = scope.run(() =>
    useSessionChat(ref({ number: 7, status: "draft" }), generateOscTest),
  );
  const prompt = "Draft OSC metadata for a glacier product";
  assert.equal(chat.sendMethod({ text: prompt }), true);
  await flushRequest();
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, "http://localhost:8000/api/generate");
  assert.equal(options.method, "POST");
  assert.deepEqual(options.headers, { "Content-Type": "application/json" });
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(options.body), {
    prompt,
    profile: "chat",
    output_format: "json",
    project_id: "earthcode-osc",
    stream: false,
  });
  assert.equal(logs.mock.callCount(), 1);
  assert.deepEqual(logs.mock.calls[0].arguments, [
    "[Git Clerk chat test] Response:",
    response,
  ]);
  assert.equal(chat.messages.value.length, 2);
  assert.equal(chat.busy.value, false);
});

test("OSC test propagates HTTP and invalid JSON errors", async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Unavailable", { status: 503 }),
  );
  await assert.rejects(
    generateOscTest("Draft OSC metadata"),
    /OSC request failed.*503/,
  );
  fetchMock.mock.mockImplementation(async () => new Response("invalid json"));
  await assert.rejects(generateOscTest("Draft OSC metadata"), SyntaxError);
});

test("chat test POSTs only text to the backend and returns the entire JSON response", async (t) => {
  const response = {
    message: "Example response",
    metadata: { isAiGenerated: true },
  };
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(response)),
  );
  const controller = new AbortController();
  assert.deepEqual(
    await generateChatTest("Explain satellite imagery", controller.signal),
    response,
  );
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, "http://localhost:8000/api/generate");
  assert.equal(options.method, "POST");
  assert.equal(options.signal, controller.signal);
  assert.deepEqual(options.headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(options.body), {
    prompt: "Explain satellite imagery",
    profile: "chat",
    output_format: "text",
    project_id: "generic-eox",
    stream: false,
  });
});

test("HTTP errors and invalid JSON reject rather than becoming successful chat responses", async (t) => {
  const mocked = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("internal details", { status: 500 }),
  );
  await assert.rejects(generateChatTest("Hello"), /HTTP 500/);
  mocked.mock.mockImplementation(async () => new Response("not JSON"));
  await assert.rejects(generateChatTest("Hello"), SyntaxError);
});

test("sending logs one response, adds no assistant reply, and blocks overlapping sends", async (t) => {
  const { chat, calls, logs } = setupChat(t);
  assert.equal(chat.sendMethod({ text: " " }), false);
  assert.equal(
    chat.sendMethod({
      text: " A change ",
      attachments: [{ name: "notes.txt", size: 12, type: "text/plain" }],
      model: "Auto",
    }),
    true,
  );
  assert.equal(chat.busy.value, true);
  assert.equal(chat.sendMethod({ text: "duplicate" }), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, "A change");
  const messages = structuredClone(toRaw(chat.messages.value));
  calls[0].resolve({ message: "Backend result", metadata: { test: true } });
  await flushRequest();
  assert.equal(chat.busy.value, false);
  assert.deepEqual(chat.messages.value, messages);
  assert.deepEqual(logs.mock.calls[0].arguments, [
    "[Git Clerk chat test] Response:",
    { message: "Backend result", metadata: { test: true } },
  ]);
});

test("metadata refresh preserves requests; navigation aborts and ignores stale responses", async (t) => {
  const { chat, session, calls, logs } = setupChat(t);
  chat.sendMethod({ text: "First session" });
  session.value = { ...session.value, title: "Renamed" };
  await nextTick();
  assert.equal(calls[0].signal.aborted, false);
  session.value = { number: 8, status: "draft" };
  await nextTick();
  assert.equal(calls[0].signal.aborted, true);
  chat.sendMethod({ text: "Next session" });
  calls[0].resolve({ message: "Late reply" });
  await flushRequest();
  assert.equal(logs.mock.callCount(), 0);
  assert.equal(chat.busy.value, true);
  calls[1].resolve({ message: "Current reply" });
  await flushRequest();
  assert.equal(logs.mock.callCount(), 1);
  assert.equal(chat.busy.value, false);
});

test("request failure only logs an error and allows another send", async (t) => {
  const { chat, calls, errors, logs } = setupChat(t);
  chat.sendMethod({ text: "Try this" });
  calls[0].reject(new Error("Network unavailable"));
  await flushRequest();
  assert.equal(chat.busy.value, false);
  assert.equal(logs.mock.callCount(), 0);
  assert.deepEqual(errors.mock.calls[0].arguments, [
    "[Git Clerk chat test] Request failed:",
    "Network unavailable",
  ]);
  assert.equal(chat.messages.value.length, 2);
  assert.equal(chat.sendMethod({ text: "Retry" }), true);
});

test("closed sessions and unmounted composers cancel pending API requests", async (t) => {
  const { chat, session, scope, calls, logs } = setupChat(t);
  chat.sendMethod({ text: "Pending" });
  session.value.status = "closed";
  await nextTick();
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(chat.sendMethod({ text: "Blocked" }), false);
  calls[0].resolve({ message: "Late" });
  await flushRequest();
  assert.equal(logs.mock.callCount(), 0);
  session.value.status = "draft";
  await nextTick();
  chat.sendMethod({ text: "Leaving" });
  scope.stop();
  assert.equal(calls[1].signal.aborted, true);
});

test("root composer can run the same test without creating a session", async (t) => {
  const { request, calls, logs } = setupChat(t);
  const scope = effectScope();
  const root = scope.run(() => useChatApiTest(request));
  t.after(() => scope.stop());
  assert.equal(root.sendMethod({ text: "Root prompt" }), true);
  calls[0].resolve({ message: "Root result" });
  await flushRequest();
  assert.equal(root.busy.value, false);
  assert.equal(logs.mock.callCount(), 1);
});
