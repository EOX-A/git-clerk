import assert from "node:assert/strict";
import test from "node:test";
import { mountNarrativePreview } from "../public/narrative-preview.js";
import {
  narrativeChatConfig,
  exampleSchemaMap,
} from "./example-chat-config.js";
import { streamChat } from "../src2/api/agentic.js";
import {
  fileConfiguration,
  formValue,
  formText,
  initialFileMode,
} from "../src2/helpers/file-editor.js";

test("narrative example uses the backend Markdown section contract for follow-ups", async (t) => {
  const original = globalThis.gitClerkConfig;
  globalThis.gitClerkConfig = { chat: structuredClone(narrativeChatConfig) };
  t.after(() => {
    globalThis.gitClerkConfig = original;
  });
  const markdown = "# Updated narrative\n\nComplete revised content.\n";
  const frames = [
    ["TEXT_MESSAGE_CONTENT", { chunk: markdown }],
    ["STATE_DELTA", { markdown }],
    ["RUN_FINISHED", { status: "success" }],
  ];
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        frames
          .map(
            ([event, data]) =>
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          )
          .join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  const existing = "# Existing narrative\n\nKeep this context.\n";
  const events = [];
  const result = await streamChat(
    {
      prompt: "Improve the introduction",
      draft: {
        title: "Narrative",
        files: { "stories/narrative.md": existing },
      },
    },
    (...event) => events.push(event),
  );
  const body = JSON.parse(mock.mock.calls[0].arguments[1].body);
  assert.equal(body.profile, "markdown_editor");
  assert.equal(body.project_id, "generic-eox");
  assert.equal(body.output_format, "markdown");
  assert.equal(body.stream, true);
  assert.equal(body.markdownSection, existing);
  assert.equal(body.markdown, undefined);
  assert.doesNotMatch(body.prompt, /draft=|STAC|OSC/);
  assert.equal(result.draft.files["stories/narrative.md"], markdown);
  assert.equal(events[0][1].chunk, markdown);
});

test("top-level narrative schema preserves raw Markdown and opens Preview by default", () => {
  const root = { gitClerkConfig: { schemaMap: exampleSchemaMap } };
  const { meta } = fileConfiguration("stories/narrative.md", root);
  const text = "# Story\n\n**Text** with [a link](https://example.org).\n";
  assert.equal(meta.output, "Story");
  assert.equal(meta.preview, "/narrative-preview.html");
  assert.deepEqual(formValue(text, meta), { Story: text });
  assert.equal(formText({ Story: text }, meta, ""), text);
  assert.equal(initialFileMode(meta.preview), "none");
  assert.equal(meta.schema.required, undefined);
  assert.equal(
    fileConfiguration("stories/chapter.md", root).meta.output,
    "Story",
  );
  assert.equal(fileConfiguration("other/story.md", root).meta, null);
});

test("storytelling preview exchanges Story updates only with its parent and respects read-only", () => {
  const events = new Map();
  const previewElement = {
    markdown: "",
    showEditor: undefined,
    toggleAttribute() {},
    addEventListener: (name, handler) => events.set(name, handler),
    removeEventListener: (name) => events.delete(name),
  };
  const status = { hidden: false, textContent: "Waiting" };
  const source = { hidden: true, textContent: "" };
  const listeners = new Map();
  const sent = [];
  const parent = { postMessage: (...args) => sent.push(args) };
  const window = {
    document: {
      referrer: "https://clerk.example/session",
      querySelector: (selector) =>
        ({
          "#storytelling-preview": previewElement,
          "#preview-status": status,
          "#preview-source": source,
        })[selector],
    },
    location: { href: "https://preview.example/narrative-preview.html" },
    parent,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  const preview = mountNarrativePreview(window);
  const event = {
    source: parent,
    origin: "https://clerk.example",
    data: {
      type: "SCHEMA_DATA_EDITOR_UPDATE",
      detail: { Story: "# First" },
      readOnly: false,
    },
  };
  listeners.get("message")({ ...event, origin: "https://untrusted.example" });
  listeners.get("message")({ ...event, source: {} });
  assert.equal(source.textContent, "");
  listeners.get("message")(event);
  assert.equal(previewElement.markdown, "");
  preview.ready();
  assert.equal(previewElement.markdown, "# First");
  assert.equal(previewElement.showEditor, "");
  const before = sent.length;
  events.get("changed")({ detail: "# First" });
  assert.equal(sent.length, before);
  events.get("changed")({ detail: "# Edited in preview" });
  assert.deepEqual(sent.at(-1), [
    {
      type: "SCHEMA_DATA_PREVIEW_UPDATE",
      detail: { Story: "# Edited in preview" },
    },
    "https://clerk.example",
  ]);
  listeners.get("message")({
    ...event,
    data: { ...event.data, detail: { Story: "# Source edit" }, readOnly: true },
  });
  assert.equal(previewElement.markdown, "# Source edit");
  assert.equal(previewElement.showEditor, undefined);
  const readOnlyCount = sent.length;
  events.get("changed")({ detail: "# Ignored" });
  assert.equal(sent.length, readOnlyCount);
  let error;
  events.get("upload:file")({
    detail: {
      update: (_value, cause) => {
        error = cause;
      },
    },
  });
  assert.match(error.message, /not connected/);
  preview.dispose();
  assert.equal(listeners.size, 0);
  assert.equal(events.size, 0);
});
