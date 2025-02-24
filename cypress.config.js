import { defineConfig } from "cypress";

export default defineConfig({
  video: true,
  e2e: {
    baseUrl: "http://localhost:3000",
    projectId: "git-clerk",
    testIsolation: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
