import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  envDir: false,
  publicDir: false,
  optimizeDeps: { entries: ["test/fixtures/v2-workspace/index.html"] },
  cacheDir: "node_modules/.vite-workspace-test",
  plugins: [
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
