import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    projectId: "git-clerk",
    testIsolation: false,
    viewportWidth: 1366,
    viewportHeight: 768,
    video: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
