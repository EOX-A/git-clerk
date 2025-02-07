import { createRouter, createWebHistory } from "vue-router";
import SessionsView from "@/views/SessionsView.vue";
import SessionView from "@/views/SessionView.vue";
import FileEditView from "@/views/FileEditView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import { BASE_URL } from "@/enums";

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes: [
    {
      path: "/",
      name: "sessions",
      component: SessionsView,
    },
    {
      path: "/:sessionNumber([a-zA-Z0-9-]+)",
      name: "session",
      component: SessionView,
    },
    {
      path: "/:sessionNumber([a-zA-Z0-9-]+)/:encodedFilePath([a-zA-Z0-9-=]+)",
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
