import { createRouter, createWebHistory } from "vue-router";
import NewSessionView from "@/views/NewSessionView.vue";
import SessionView from "@/views/SessionView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "new-session",
      component: NewSessionView,
    },
    {
      path: "/:sessionNumber(\\d+)",
      name: "session",
      component: SessionView,
    },
  ],
});

export default router;
