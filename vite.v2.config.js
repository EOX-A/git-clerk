import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: fileURLToPath(new URL("./src2", import.meta.url)),
  base: "./",
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  cacheDir: "../node_modules/.vite-v2",
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes("eox-"),
        },
      },
    }),
    tailwindcss(),
  ],
  server: {
    port: 3001,
    strictPort: true,
  },
  envPrefix: ["GITCLERK_USERNAME", "GITCLERK_EMAIL", "GITCLERK_PROFILE_NAME"],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src2", import.meta.url)),
    },
  },
  build: {
    outDir: "../dist-v2",
    emptyOutDir: true,
  },
});
