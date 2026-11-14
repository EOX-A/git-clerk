import { createRouter, createWebHistory } from "vue-router";
import HelloWorldView from "@/views/HelloWorldView.vue";
import SessionView from "@/views/SessionView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "hello-world",
      component: HelloWorldView,
    },
    {
      path: "/:sessionNumber(\\d+)",
      name: "session",
      component: SessionView,
    },
  ],
});

export default router;
