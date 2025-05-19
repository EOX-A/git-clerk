import { createRouter, createWebHistory } from "vue-router";
import SessionsView from "@/views/SessionsView.vue";
import SessionView from "@/views/SessionView.vue";
import FileEditView from "@/views/FileEditView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import FileBrowserView from "@/views/FileBrowserView.vue";
import { BASE_PATH, VIEWING_MODE } from "@/enums";

let firstLoad = true;

const router = createRouter({
  history: createWebHistory(BASE_PATH),
  routes: [
    {
      path: "/",
      name: "sessions",
      component: SessionsView,
    },
    {
      path: "/file-browser",
      name: "file-browser",
      component: FileBrowserView,
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

router.beforeEach((to, from, next) => {
  if (
    to.path === "/" &&
    VIEWING_MODE === "file-browser" &&
    firstLoad &&
    !to.query.automation
  ) {
    next("/file-browser");
  } else {
    next();
  }
  firstLoad = false;
});

export default router;
