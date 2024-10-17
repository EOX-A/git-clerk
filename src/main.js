import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "@/router";
import vuetify from "@/plugins/vuetify";
import VueProgressBar from "@aacassandra/vue3-progressbar";

const app = createApp(App);

app.use(vuetify);
app.use(VueProgressBar, {
  color: "#D6EEFF",
  failedColor: "#874b4b",
  thickness: "2px",
  transition: {
    speed: "0.2s",
    opacity: "0.6s",
    termination: 300,
  },
  autoRevert: true,
  location: "top",
  inverse: false,
});
app.use(router);
app.mount("#app");
