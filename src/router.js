import { createRouter, createWebHistory } from "vue-router";
import SessionsView from "@/views/SessionsView.vue";
import SessionView from "@/views/SessionView.vue";
import FileEditView from "@/views/FileEditView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "sessions",
      component: SessionsView,
    },
    {
      path: "/:sessionNumber",
      name: "session",
      component: SessionView,
    },
    {
      path: "/:sessionNumber/:encodedFilePath",
      name: "file-edit",
      component: FileEditView,
    },
    {
      path: "/:catchAll(.*)",
      name: "Not Found",
      component: NotFoundView,
    },
  ],
});

export default router;
