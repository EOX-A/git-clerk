import oscDraft from "./fixtures/v2-workspace/osc-draft.js";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  envDir: false,
  publicDir: false,
  define: {
    "import.meta.env.GITCLERK_AGENTIC_API_URL": JSON.stringify("/test/agentic"),
  },
  optimizeDeps: { entries: ["test/fixtures/v2-workspace/*.html"] },
  cacheDir: "node_modules/.vite-workspace-test",
  plugins: [
    {
      name: "mock-chat-api",
      configureServer(server) {
        let publishCount = 0;
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
                const result = {
                  message:
                    '### Synthetic ocean monitoring\n\nI’m preparing a **sample OSC bundle** with linked metadata.\n\n- A sea-surface-temperature product\n- An ocean-monitoring project\n- A linked climate variable\n\n| Entity | File |\n| --- | --- |\n| Product | `collection.json` |\n| Variable | `catalog.json` |\n\n```json\n{"id": "sample-ocean", "synthetic": true}\n```\n\nThese files are **generated, not yet saved**. [STAC reference](https://stacspec.org).',
                  draft: oscDraft,
                };
                // Follow-ups return just one edited file; the branch keeps the rest.
                if (
                  request.history?.some(({ content }) =>
                    content?.startsWith("Current OSC draft"),
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
