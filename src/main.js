import "./assets/main.css";
import "vue-loading-overlay/dist/css/index.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "@/router";
import vuetify from "@/plugins/vuetify";
import i18n from "@/plugins/i18n";
import { LoadingPlugin } from "vue-loading-overlay";
import { createPinia } from "pinia";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(vuetify);
app.use(router);
app.use(i18n);
app.use(LoadingPlugin);
app.mount("#app");
