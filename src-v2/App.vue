<script setup>
import { nextTick, onMounted, provide, ref, shallowRef } from "vue";
import { RouterView, useRoute } from "vue-router";
import Navbar from "@/components/nav/Navbar.vue";
import NavIcon from "@/components/nav/NavIcon.vue";
import Toast from "@/components/global/Toast.vue";
import useSessionsStore from "@/stores/sessions.js";

const route = useRoute();
const theme = ref("light");
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

onMounted(() => useSessionsStore().loadSessions(false, true));

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
      :update-theme="(value) => (theme = value)"
      :mobile-open="mobileSidebarOpen"
      :close-sidebar="closeSidebarMethod"
    />
    <div class="flex min-w-0 flex-1 flex-col" :inert="mobileSidebarOpen">
      <header
        v-if="route.name !== 'session'"
        class="flex h-14 shrink-0 items-center gap-3 border-b border-border-soft px-3 workspace:hidden"
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
