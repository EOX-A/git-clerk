import assert from "node:assert/strict";
import test from "node:test";
import { effectScope, nextTick, ref } from "vue";
import {
  clampDockedWidth,
  clampFloatingBounds,
  resizeFloatingBounds,
} from "../src2/helpers/chat-layout.js";
import { getDummyMessages, splitFilePath } from "../src2/helpers/chat-dummy.js";
import useSessionChat from "../src2/helpers/use-session-chat.js";

test("demo copy does not invent repository actions or depend on PR numbers", () => {
  assert.deepEqual(
    getDummyMessages({ number: 176 }),
    getDummyMessages({ number: 999 }),
  );
  assert.match(getDummyMessages()[0].text, /won’t change your files/);
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

const setupChat = (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const scope = effectScope();
  const session = ref({ number: 7, status: "draft" });
  const chat = scope.run(() => useSessionChat(session));
  t.after(() => scope.stop());
  return { scope, session, chat };
};

test("one send adds one turn, keeps attachment metadata, blocks overlapping sends", (t) => {
  const { chat } = setupChat(t);
  assert.equal(chat.sendMethod({ text: " " }), false);
  assert.equal(
    chat.sendMethod({
      text: " A change ",
      attachments: [
        {
          name: "notes.txt",
          size: 12,
          type: "text/plain",
          secret: "not retained",
        },
      ],
      model: "Auto",
    }),
    true,
  );
  assert.equal(chat.busy.value, true);
  assert.equal(chat.sendMethod({ text: "duplicate" }), false);
  assert.equal(chat.messages.value.filter((m) => m.role === "user").length, 1);
  assert.deepEqual(chat.messages.value[1].attachments, [
    { name: "notes.txt", size: 12, type: "text/plain" },
  ]);
  t.mock.timers.tick(500);
  assert.equal(chat.busy.value, false);
  assert.equal(chat.messages.value.length, 3);
  assert.match(
    chat.messages.value.at(-1).text,
    /no files or branches were changed/,
  );
});

test("metadata refresh keeps conversation; navigation cancels pending replies", async (t) => {
  const { chat, session } = setupChat(t);
  chat.sendMethod({ text: "Keep this conversation" });
  session.value = { ...session.value, title: "Renamed", updatedAt: "new" };
  await nextTick();
  assert.equal(chat.messages.value[1].text, "Keep this conversation");
  session.value = { number: 8, status: "draft" };
  await nextTick();
  t.mock.timers.tick(1000);
  assert.deepEqual(chat.messages.value, getDummyMessages());
  assert.equal(chat.busy.value, false);
});

test("closing or disposing the session cancels demo replies", async (t) => {
  const { chat, session, scope } = setupChat(t);
  chat.sendMethod({ text: "Pending" });
  session.value.status = "closed";
  await nextTick();
  t.mock.timers.tick(1000);
  assert.equal(chat.messages.value.length, 2);
  assert.equal(chat.sendMethod({ text: "Blocked" }), false);
  session.value.status = "draft";
  await nextTick();
  chat.sendMethod({ text: "Leaving" });
  scope.stop();
  t.mock.timers.tick(1000);
  assert.equal(chat.messages.value.at(-1).text, "Leaving");
  assert.equal(chat.busy.value, false);
});
