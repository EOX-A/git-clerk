import { createRouter, createWebHistory } from "vue-router";
import SessionView from "@/views/SessionView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "new-session",
      component: SessionView,
    },
    {
      path: "/:sessionNumber(\\d+)",
      name: "session",
      component: SessionView,
    },
  ],
});

export default router;
