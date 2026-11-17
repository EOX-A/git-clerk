import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory, RouterView } from "vue-router";
import Fixture from "./Fixture.vue";
import ChatFixture from "./ChatFixture.vue";
import App from "../../../src2/App.vue";
import NewSessionView from "../../../src2/views/NewSessionView.vue";
import SessionView from "../../../src2/views/SessionView.vue";
import installCreationFixture from "./create-session.js";
import "../../../src2/assets/main.css";

const chat = new URLSearchParams(window.location.search).has("chat");
const creation = new URLSearchParams(window.location.search).has("create");
const router = createRouter({
  history: createWebHistory(),
  routes:
    creation || chat
      ? [
          {
            path: "/",
            alias: "/test/fixtures/v2-workspace/index.html",
            name: "new-session",
            component: NewSessionView,
          },
          {
            path: "/:sessionNumber(\\d+)",
            name: "session",
            component: SessionView,
          },
        ]
      : [{ path: "/:pathMatch(.*)*", component: Fixture }],
});
const app = createApp(chat ? ChatFixture : creation ? App : RouterView)
  .use(createPinia())
  .use(router);
if (creation) installCreationFixture();
if (chat) await router.replace("/7");
app.mount("#app");
