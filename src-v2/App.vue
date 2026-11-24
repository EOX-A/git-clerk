<script setup>
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowRef,
} from "vue";
import { RouterView, useRoute } from "vue-router";
import Navbar from "@/components/nav/Navbar.vue";
import NavIcon from "@/components/nav/NavIcon.vue";
import Toast from "@/components/global/Toast.vue";
import useSessionsStore from "@/stores/sessions.js";

const route = useRoute();
const localTheme = ref("light");
const luigiDarkMode = inject("luigi-dark-mode", null);
const systemScheme = window.matchMedia("(prefers-color-scheme: dark)");
const prefersDark = ref(systemScheme.matches);
const updateSystemScheme = ({ matches }) => (prefersDark.value = matches);
const hostTheme = computed(() => {
  const mode = luigiDarkMode?.value;
  if (mode === "auto") return prefersDark.value ? "dark" : "light";
  return mode === "light" || mode === "dark" ? mode : null;
});
const theme = computed(() => hostTheme.value ?? localTheme.value);
const snackbar = ref(false);
provide("set-snackbar", snackbar);
const mobileSidebarOpen = ref(false);
const menuButton = ref(null);
const sidebarTrigger = shallowRef(null);
const openSidebarMethod = (event) => {
  sidebarTrigger.value = event.currentTarget;
  mobileSidebarOpen.value = true;
};
provide("session-sidebar", {
  open: mobileSidebarOpen,
  openMethod: openSidebarMethod,
});

onMounted(() => {
  systemScheme.addEventListener("change", updateSystemScheme);
  useSessionsStore().loadSessions(false, true);
});
onUnmounted(() =>
  systemScheme.removeEventListener("change", updateSystemScheme),
);

const closeSidebarMethod = async () => {
  mobileSidebarOpen.value = false;
  await nextTick();
  if (sidebarTrigger.value?.isConnected) sidebarTrigger.value.focus();
  else menuButton.value?.focus();
};
</script>

<template>
  <div :data-gc="theme" class="flex h-dvh overflow-hidden bg-bg text-text">
    <Navbar
      :theme="theme"
      :show-theme="hostTheme === null"
      :update-theme="(value) => (localTheme = value)"
      :mobile-open="mobileSidebarOpen"
      :close-sidebar="closeSidebarMethod"
    />
    <div
      class="group/workspace flex min-w-0 flex-1 flex-col"
      :inert="mobileSidebarOpen"
    >
      <header
        v-if="route.name !== 'session'"
        class="flex h-14 shrink-0 items-center gap-3 border-b border-border-soft px-3 group-has-[.file-workspace]/workspace:hidden workspace:hidden"
      >
        <button
          ref="menuButton"
          type="button"
          aria-label="Open sidebar"
          aria-controls="global-navigation"
          :aria-expanded="mobileSidebarOpen"
          class="flex size-11 items-center justify-center rounded-control text-muted hover:bg-hover"
          @click="openSidebarMethod"
        >
          <NavIcon name="menu" />
        </button>
        <span class="text-[15px] font-bold tracking-[-0.02em]">Git Clerk</span>
      </header>
      <main id="workspace" tabindex="-1" class="min-h-0 flex-1 overflow-y-auto">
        <RouterView />
      </main>
      <Toast />
    </div>
  </div>
</template>
