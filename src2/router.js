import { createRouter, createWebHistory } from "vue-router";
import HelloWorldView from "@/views/HelloWorldView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "hello-world",
      component: HelloWorldView,
    },
  ],
});

export default router;
