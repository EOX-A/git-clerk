import assert from "node:assert/strict";
import test from "node:test";
import { createMarkmendParser } from "vue-stream-markdown";
import { transformHardenedUrl } from "@stream-markdown/core";
import { createChatDraftStream } from "../src2/helpers/chat-draft-stream.js";
import { streamedMessage } from "../src2/helpers/event-stream.js";
import {
  chatMarkdownParser,
  chatMarkdownSecurity,
  chatPullRequestUrl,
} from "../src2/helpers/chat-markdown.js";

test("file previews handle one-character chunks, nested JSON and escaped strings", () => {
  const files = {
    "products/sample/collection.json": {
      id: "sample",
      description: 'A "quote", } and \\ 🌍',
      links: [{ href: "../catalog.json" }],
    },
    "eo-missions/Sentinel-1/catalog.json": { id: "Sentinel-1" },
  };
  const events = [];
  const feed = createChatDraftStream((file) => events.push(file));
  const text =
    "```json\n" +
    JSON.stringify({
      message: 'Text with { "files": {} }',
      draft: { title: "Demo", files },
    }) +
    "\n```";
  for (const character of text) feed(character);
  assert.deepEqual(
    events.map((file) => file.status),
    ["Generating", "Generated", "Generating", "Generated"],
  );
  assert.deepEqual(
    Object.fromEntries(
      events
        .filter((file) => file.content)
        .map((file) => [file.path, file.content]),
    ),
    files,
  );
});

test("incomplete file JSON stays pending and prose never becomes a file preview", () => {
  const events = [];
  const feed = createChatDraftStream((file) => events.push(file));
  feed(
    '{"message":"Hi","draft":{"files":{"products/a/collection.json":{"id":"a',
  );
  assert.deepEqual(events, [
    { path: "products/a/collection.json", status: "Generating" },
  ]);
  const plain = createChatDraftStream((file) => events.push(file));
  plain('Here is {"draft":{"files":{"products/b/collection.json":{}}}}');
  assert.equal(events.length, 1);
});

test("JSON fences with no language or uppercase JSON never expose draft content as prose", () => {
  for (const fence of ["```\n", "```JSON\n"]) {
    const text =
      fence +
      '{"message":"Ready","draft":{"files":{"products/a/collection.json":{"id":"a"}}}}';
    assert.equal(streamedMessage(text), "Ready");
    const files = [];
    createChatDraftStream((file) => files.push(file))(text);
    assert.equal(files.at(-1).content.id, "a");
  }
});

test("Markdown formats partial text and tables while blocking active content", async () => {
  const parser = createMarkmendParser({
    parserOptions: chatMarkdownParser,
    syntax: { security: chatMarkdownSecurity },
  });
  const partial = await parser.parse("## Draft\n\n**Ocean", "streaming");
  assert.ok(JSON.stringify(partial.document.nodes).includes('"strong"'));
  const result = await parser.parse(
    '## Draft\n\n- **Ocean** with `id`\n\n| Name | Type |\n| --- | --- |\n| A | Product |\n\n```json\n{"id":"a"}\n```\n\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n[bad](javascript:alert(1))\n[Good](https://example.test)\n![tracking](https://example.test/pixel)',
    "static",
  );
  const nodes = [];
  const visit = (node) => {
    if (!Array.isArray(node)) return;
    nodes.push(node);
    node.slice(2).forEach(visit);
  };
  result.document.nodes.forEach(visit);
  for (const tag of ["h2", "ul", "strong", "table", "pre", "code", "a"])
    assert.ok(
      nodes.some((node) => node[0] === tag),
      tag,
    );
  assert.ok(
    !nodes.some((node) => ["script", "iframe", "object"].includes(node[0])),
  );
  assert.ok(
    !nodes.some(
      (node) =>
        node[1].onerror ||
        node[1].src ||
        String(node[1].href || "").startsWith("javascript:"),
    ),
  );
});

test("PR cards only link to matching HTTPS GitHub pull requests", () => {
  assert.equal(
    chatPullRequestUrl({
      number: 7,
      url: "https://github.com/alice/repo/pull/7",
    }),
    "https://github.com/alice/repo/pull/7",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://evil.test/pull/7",
    "https://github.com/alice/repo/pull/8",
    "https://user:pass@github.com/alice/repo/pull/7",
  ])
    assert.equal(chatPullRequestUrl({ number: 7, url }), null);
});

test("the Markdown renderer permits web links but rejects executable URLs", () => {
  assert.equal(
    transformHardenedUrl("https://stacspec.org", chatMarkdownSecurity),
    "https://stacspec.org/",
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
  ])
    assert.equal(transformHardenedUrl(url, chatMarkdownSecurity), null);
});
