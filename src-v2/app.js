import { createApp } from "vue";
import App from "./App.vue";
import router from "@/router";
import { createPinia } from "pinia";
import LuigiClient from "@luigi-project/client";
import useGitStore from "@/stores/git.js";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const gitStore = useGitStore(pinia);
const updateProfile = (context) => {
  const user = context?.user;
  gitStore.setUser({
    username: user?.preferred_username,
    email: user?.email,
    name: user?.name,
  });
};
LuigiClient.addInitListener(updateProfile);
LuigiClient.addContextUpdateListener(updateProfile);

app.use(router);

export default app;
