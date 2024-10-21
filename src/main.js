import "./assets/main.css";
import "vue-loading-overlay/dist/css/index.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "@/router";
import vuetify from "@/plugins/vuetify";
import { LoadingPlugin } from "vue-loading-overlay";

const app = createApp(App);

app.use(vuetify);
app.use(router);
app.use(LoadingPlugin);
app.mount("#app");
