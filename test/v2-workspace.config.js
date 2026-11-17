import oscDraft from "./fixtures/v2-workspace/osc-draft.js";
import exampleChatConfig, {
  exampleSchemaMap,
  narrativeChatConfig,
} from "./example-chat-config.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  envDir: false,
  publicDir: false,
  optimizeDeps: { entries: ["test/fixtures/v2-workspace/*.html"] },
  cacheDir: "node_modules/.vite-workspace-test",
  plugins: [
    {
      name: "example-chat-config",
      resolveId(id) {
        if (id === "virtual:example-chat-config") return "\0" + id;
      },
      load(id) {
        if (id === "\0virtual:example-chat-config")
          return `export default ${JSON.stringify(exampleChatConfig)}; export const schemaMap = ${JSON.stringify(exampleSchemaMap)}; export const narrativeConfig = ${JSON.stringify(narrativeChatConfig)};`;
      },
    },
    {
      name: "mock-chat-api",
      configureServer(server) {
        let publishCount = 0;
        // Serve only the supplied public preview, without other public configuration.
        server.middlewares.use((req, res, next) => {
          const path = req.url?.split("?")[0];
          if (
            !["/narrative-preview.html", "/narrative-preview.js"].includes(path)
          )
            return next();
          const source = new URL(`../public${path}`, import.meta.url);
          const content = readFileSync(source, "utf8");
          res.setHeader(
            "Content-Type",
            path.endsWith(".html") ? "text/html" : "text/javascript",
          );
          res.end(content);
        });
        // Session URL refreshes must load the v2 fixture, not the repository's v1 index.
        server.middlewares.use((req, _res, next) => {
          if (
            req.headers.accept?.includes("text/html") &&
            /^\/\d+(?:\?|$)/.test(req.url || "")
          ) {
            const query = req.url.includes("?")
              ? req.url.slice(req.url.indexOf("?"))
              : "";
            req.url = `/test/fixtures/v2-workspace/index.html${query}`;
          }
          next();
        });
        server.middlewares.use(
          "/test/agentic/api/mcp/call",
          async (req, res, next) => {
            if (req.method !== "POST") return next();
            let body = "";
            for await (const chunk of req) body += chunk;
            const request = JSON.parse(body);
            if (
              request.server_id !== "eox-git-broker" ||
              request.tool_name !== "git_publish_bundle" ||
              req.headers["x-git-token"] !== "fixture-token"
            ) {
              res.statusCode = 400;
              res.end("Invalid mock broker request");
              return;
            }
            const args = request.arguments;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                status: "published",
                provider: "github",
                mode: "github_live",
                repo: args.repo,
                branch: args.target_branch,
                commit_sha: (++publishCount).toString(16).padStart(40, "0"),
                pr_number: 7,
                pr_url: `https://github.com/${args.repo}/pull/7`,
              }),
            );
          },
        );
        server.middlewares.use(
          "/test/agentic/api/generate",
          async (req, res, next) => {
            if (req.method !== "POST") return next();
            let body = "";
            for await (const chunk of req) body += chunk;
            try {
              const request = JSON.parse(body);
              if (request.stream) {
                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache");
                const emit = (event, data) =>
                  res.write(
                    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                  );
                emit("RUN_STARTED", { profile: "json" });
                if (request.profile === "markdown_editor") {
                  const markdown = request.markdownSection
                    ? "# Ocean observation\n\nAn updated synthetic introduction.\n\n## What we observe\n\n- Sea surface temperature\n- Seasonal changes\n"
                    : "# Ocean observation\n\nA **synthetic narrative** for testing the live preview.\n\n## What we observe\n\n- Sea surface temperature\n- Seasonal changes\n\n> Earth observation helps us tell a clearer story.\n\n| Observation | Frequency |\n| --- | --- |\n| Temperature | Daily |\n";
                  for (let i = 0; i < markdown.length; i += 35) {
                    if (res.destroyed) return;
                    emit("TEXT_MESSAGE_CONTENT", {
                      chunk: markdown.slice(i, i + 35),
                    });
                    await new Promise((resolve) => setTimeout(resolve, 40));
                  }
                  emit("STATE_DELTA", { markdown });
                  emit("RUN_FINISHED", { status: "success" });
                  res.end();
                  return;
                }
                const result = {
                  message:
                    '### Synthetic ocean monitoring\n\nI’m preparing a **sample OSC bundle** with linked metadata.\n\n- A sea-surface-temperature product\n- An ocean-monitoring project\n- A linked climate variable\n\n| Entity | File |\n| --- | --- |\n| Product | `collection.json` |\n| Variable | `catalog.json` |\n\n```json\n{"id": "sample-ocean", "synthetic": true}\n```\n\nThese files are **generated, not yet saved**. [STAC reference](https://stacspec.org).',
                  draft: oscDraft,
                };
                const narrative = request.project_id === "generic-eox";
                if (narrative) {
                  result.message = "A synthetic ocean story is ready.";
                  result.draft = {
                    title: "Sample ocean story",
                    files: {
                      "stories/sample.md":
                        "# Ocean story\n\nA synthetic story for testing.\n",
                    },
                  };
                }
                // Follow-ups return just one edited file; the branch keeps the rest.
                if (
                  request.history?.some(({ content }) =>
                    /^Current (?:OSC )?draft/.test(content || ""),
                  )
                ) {
                  result.message =
                    "Updated the sample product description. The other session files are unchanged.";
                  result.draft = {
                    title: "Update sample product description",
                    files: {
                      "products/sample/collection.json": {
                        ...oscDraft.files["products/sample/collection.json"],
                        description:
                          "Updated synthetic ocean product for the existing PR.",
                      },
                    },
                  };
                  if (narrative) {
                    result.message = "Updated the story introduction.";
                    result.draft = {
                      title: "Update story",
                      files: {
                        "stories/sample.md":
                          "# Ocean story\n\nAn updated synthetic introduction.\n",
                      },
                    };
                  }
                }
                const text = JSON.stringify(result);
                for (let i = 0; i < text.length; i += 35) {
                  if (res.destroyed) return;
                  emit("TEXT_MESSAGE_CONTENT", {
                    chunk: text.slice(i, i + 35),
                  });
                  await new Promise((resolve) => setTimeout(resolve, 40));
                }
                emit("STATE_DELTA", {
                  message: JSON.stringify(result),
                  components: [],
                });
                emit("RUN_FINISHED", { status: "success" });
                res.end();
                return;
              }
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Mock backend response — no LLM was called.",
                  received: request,
                }),
              );
            } catch {
              res.statusCode = 400;
              res.end("Invalid fixture request");
            }
          },
        );
      },
    },
    vue({
      template: {
        compilerOptions: { isCustomElement: (tag) => tag.startsWith("eox-") },
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src2", import.meta.url)) },
  },
  server: { host: "127.0.0.1", port: 3002, strictPort: true },
});
