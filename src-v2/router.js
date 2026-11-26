import { createRouter, createWebHistory } from "vue-router";
import SessionView from "@/views/SessionView.vue";

const normalizeBasePath = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "./" ? trimmed : "";
};

export const resolveBasePath = (
  configBasePath = globalThis.gitClerkConfig?.basePath,
  envBaseUrl = import.meta.env?.BASE_URL,
) => normalizeBasePath(configBasePath) || normalizeBasePath(envBaseUrl) || "/";

const router = createRouter({
  history: createWebHistory(resolveBasePath()),
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
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

export default router;
