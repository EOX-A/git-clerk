import { createApp, shallowRef } from "vue";
import App from "./App.vue";
import router from "@/router";
import { createPinia } from "pinia";
import LuigiClient from "@luigi-project/client";
import useGitStore from "@/stores/git.js";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const gitStore = useGitStore(pinia);
const luigiDarkMode = shallowRef(null);
app.provide("luigi-dark-mode", luigiDarkMode);

const updateLuigiContext = (context) => {
  const user = context?.user;
  gitStore.setUser({
    username: user?.preferred_username,
    email: user?.email,
    name: user?.name,
  });
  luigiDarkMode.value =
    context?.darkMode ??
    (LuigiClient.getActiveFeatureToggles().includes("darkMode")
      ? "auto"
      : null);
};
export const luigiReady = new Promise((resolve) => {
  // Standalone pages can mount immediately. An iframe may be waiting for its host.
  const fallback =
    window.parent === window ? undefined : window.setTimeout(resolve, 1000);
  LuigiClient.addInitListener((context) => {
    updateLuigiContext(context);
    window.clearTimeout(fallback);
    resolve();
  });
  if (fallback === undefined) resolve();
});
LuigiClient.addContextUpdateListener(updateLuigiContext);

app.use(router);

export default app;
