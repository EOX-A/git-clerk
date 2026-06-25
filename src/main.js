import "./assets/main.css";
import "vue-loading-overlay/dist/css/index.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "@/router";
import vuetify from "@/plugins/vuetify";
import i18n from "@/plugins/i18n";
import { LoadingPlugin } from "vue-loading-overlay";
import { createPinia } from "pinia";
import useAutomationStore from "@/stores/automation";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(vuetify);
app.use(router);
app.use(i18n);
app.use(LoadingPlugin);
app.mount("#app");

if (window.opener) {
  window.opener.postMessage("automation-ready", "*");
}

window.addEventListener("message", (event) => {
  useAutomationStore().setExternalAutomation(event.data);
});

const params = Object.fromEntries(new URLSearchParams(window.location.search));
if (Object.keys(params).length) {
  if (params.automation) {
    useAutomationStore().setExternalAutomation(params);
    router.replace({
      query: {},
    });
  }
}
