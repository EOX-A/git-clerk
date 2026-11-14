<script setup>
import { nextTick, onMounted, ref } from "vue";
import { RouterView } from "vue-router";
import Navbar from "@/components/nav/Navbar.vue";
import NavIcon from "@/components/nav/NavIcon.vue";
import useSessionsStore from "@/stores/sessions.js";

const theme = ref("light");
const mobileSidebarOpen = ref(false);
const menuButton = ref(null);

onMounted(() => useSessionsStore().loadSessions());

const closeSidebarMethod = async () => {
  mobileSidebarOpen.value = false;
  await nextTick();
  menuButton.value?.focus();
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
        class="flex h-14 shrink-0 items-center gap-3 border-b border-border-soft px-3 workspace:hidden"
      >
        <button
          ref="menuButton"
          type="button"
          aria-label="Open sidebar"
          aria-controls="global-navigation"
          :aria-expanded="mobileSidebarOpen"
          class="flex size-11 items-center justify-center rounded-control text-muted hover:bg-hover"
          @click="mobileSidebarOpen = true"
        >
          <NavIcon name="menu" />
        </button>
        <span class="text-[15px] font-bold tracking-[-0.02em]">Git Clerk</span>
      </header>
      <main id="workspace" tabindex="-1" class="min-h-0 flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
