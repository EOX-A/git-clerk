<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import NavIcon from "@/components/nav/NavIcon.vue";
import SessionList from "@/components/nav/SessionList.vue";
import SidebarResizeHandle from "@/components/nav/SidebarResizeHandle.vue";
import useOctokitStore from "@/stores/octokit.js";
import { storeToRefs } from "pinia";

const props = defineProps({
  theme: { type: String, required: true },
  updateTheme: { type: Function, required: true },
  mobileOpen: { type: Boolean, default: false },
  closeSidebar: { type: Function, required: true },
});

const router = useRouter();
const { githubUserData } = storeToRefs(useOctokitStore());
const narrowViewport = window.matchMedia("(max-width: 859px)");
const isNarrow = ref(narrowViewport.matches);
const isCollapsed = ref(false);
const sidebarWidth = ref(264);
const isRail = computed(() => isCollapsed.value && !isNarrow.value);
const accountOpen = ref(false);
const sidebar = ref(null);
const toggleButton = ref(null);
const accountArea = ref(null);
const accountButton = ref(null);
const accountPanel = ref(null);

const closeAccountMethod = (restoreFocus = false) => {
  accountOpen.value = false;
  if (restoreFocus) accountButton.value?.focus();
};

const toggleAccountMethod = async () => {
  accountOpen.value = !accountOpen.value;
  if (accountOpen.value) {
    await nextTick();
    accountPanel.value?.querySelector("input:checked")?.focus();
  }
};

const toggleSidebarMethod = () => {
  closeAccountMethod();
  if (isNarrow.value) props.closeSidebar();
  else isCollapsed.value = !isCollapsed.value;
};

const newSessionMethod = async () => {
  closeAccountMethod();
  await router.push({ name: "hello-world" });
  if (props.mobileOpen) await props.closeSidebar();
  document.getElementById("workspace")?.focus();
};

const selectSessionMethod = async (session) => {
  closeAccountMethod();
  await router.push({
    name: "session",
    params: { sessionNumber: session.number },
  });
  if (props.mobileOpen) await props.closeSidebar();
  document.getElementById("workspace")?.focus();
};

const outsideAccountMethod = (event) => {
  if (!accountArea.value?.contains(event.target)) closeAccountMethod();
};

const accountBlurMethod = (event) => {
  // A label click briefly clears focus before focusing its radio input.
  if (
    event.relatedTarget &&
    !accountArea.value?.contains(event.relatedTarget)
  ) {
    closeAccountMethod();
  }
};

const sidebarKeyMethod = (event) => {
  if (event.key === "Escape") {
    if (accountOpen.value) {
      event.preventDefault();
      closeAccountMethod(true);
    } else if (props.mobileOpen) {
      event.preventDefault();
      props.closeSidebar();
    }
  }
  // Keep keyboard focus inside the modal drawer while the workspace is inert.
  if (event.key !== "Tab" || !props.mobileOpen) return;
  const controls = Array.from(
    sidebar.value.querySelectorAll("button:not(:disabled), input, a[href]"),
  ).filter((element) => element.getClientRects().length);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
};

const viewportChangeMethod = (event) => {
  isNarrow.value = event.matches;
  closeAccountMethod();
  if (props.mobileOpen) props.closeSidebar();
};

watch(
  () => props.mobileOpen,
  async (open) => {
    if (open) {
      await nextTick();
      toggleButton.value?.focus();
    } else closeAccountMethod();
  },
);

onMounted(() => {
  narrowViewport.addEventListener("change", viewportChangeMethod);
  document.addEventListener("pointerdown", outsideAccountMethod);
});

onUnmounted(() => {
  narrowViewport.removeEventListener("change", viewportChangeMethod);
  document.removeEventListener("pointerdown", outsideAccountMethod);
});
</script>

<template>
  <div
    v-if="mobileOpen"
    aria-hidden="true"
    class="fixed inset-0 z-30 bg-scrim workspace:hidden"
    @click="closeSidebar"
  ></div>
  <aside
    id="global-navigation"
    ref="sidebar"
    :role="isNarrow ? 'dialog' : undefined"
    :aria-modal="isNarrow && mobileOpen ? true : undefined"
    aria-label="Global navigation"
    :class="[
      mobileOpen ? 'flex' : 'hidden workspace:flex',
      isRail ? 'w-rail' : 'w-sidebar',
    ]"
    :style="!isRail && !isNarrow ? { width: `${sidebarWidth}px` } : undefined"
    class="fixed inset-y-0 left-0 z-40 shrink-0 flex-col border-r border-border-soft bg-sidebar workspace:relative"
    @keydown="sidebarKeyMethod"
  >
    <nav aria-label="Sessions" class="flex h-full min-h-0 flex-col">
      <div
        :class="
          isRail
            ? 'justify-center px-2 pt-2.5'
            : 'justify-between pt-3 pr-2.5 pb-1.5 pl-4'
        "
        class="flex items-center"
      >
        <span v-if="!isRail" class="inline-flex items-center gap-2">
          <span
            class="flex size-[22px] items-center justify-center rounded-md bg-primary text-on-primary"
          >
            <NavIcon name="branch" class="size-3.5" />
          </span>
          <span class="text-[15px] font-bold tracking-[-0.02em]"
            >Git Clerk</span
          >
        </span>
        <button
          ref="toggleButton"
          type="button"
          :aria-label="
            isNarrow
              ? 'Close sidebar'
              : isRail
                ? 'Expand sidebar'
                : 'Collapse sidebar'
          "
          :title="
            isNarrow
              ? 'Close sidebar'
              : isRail
                ? 'Expand sidebar'
                : 'Collapse sidebar'
          "
          class="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-text workspace:size-8"
          @click="toggleSidebarMethod"
        >
          <NavIcon :name="isNarrow ? 'x' : 'panel'" />
        </button>
      </div>

      <div :class="isRail ? 'px-2 pt-1' : 'px-2 pt-3.5'">
        <button
          type="button"
          aria-label="New session"
          title="New session"
          :class="
            isRail
              ? 'justify-center hover:bg-hover'
              : 'gap-2.5 px-2.5 bg-[color-mix(in_srgb,var(--primary)_4%,var(--hover))] hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--hover))] active:bg-[color-mix(in_srgb,var(--primary)_12%,var(--hover))]'
          "
          class="flex h-11 w-full items-center rounded-control text-ui font-medium workspace:h-[38px]"
          @click="newSessionMethod"
        >
          <NavIcon name="new" class="text-primary" />
          <span v-if="!isRail">New session</span>
        </button>
      </div>

      <template v-if="!isRail">
        <div class="mt-2.5 mb-0.5 border-t border-border-soft"></div>
        <div class="flex items-center gap-1 pt-2.5 pr-2 pb-1 pl-[18px]">
          <h2 class="flex-1 text-meta font-medium text-muted">Sessions</h2>
          <button
            type="button"
            disabled
            aria-label="Filter, sort and group sessions"
            title="Session filters coming next"
            class="flex size-11 items-center justify-center rounded-lg text-muted opacity-50 workspace:size-7"
          >
            <NavIcon name="sliders" class="size-4" />
          </button>
        </div>
        <SessionList :on-select-session="selectSessionMethod" />
      </template>
      <div v-else class="flex-1"></div>

      <div :class="isRail ? 'px-2 pb-3' : 'border-t border-border-soft p-3'">
        <div ref="accountArea" class="relative" @focusout="accountBlurMethod">
          <div
            v-if="accountOpen"
            id="account-panel"
            ref="accountPanel"
            role="dialog"
            aria-label="Account and appearance"
            :class="
              isRail
                ? 'bottom-0 left-[calc(100%+10px)] w-sidebar'
                : 'right-0 bottom-[calc(100%+6px)] left-0'
            "
            class="absolute z-50 rounded-xl border border-border-soft bg-elev p-1.5 shadow-menu"
          >
            <p class="px-2 pt-1.5 pb-2 text-meta text-muted">
              {{
                githubUserData
                  ? "Signed in with GitHub"
                  : "GitHub account not connected"
              }}
            </p>
            <fieldset
              class="mx-0.5 mb-1.5 flex gap-0.5 rounded-[10px] bg-hover p-[3px]"
            >
              <legend class="sr-only">Theme</legend>
              <label
                v-for="option in ['light', 'dark']"
                :key="option"
                class="relative flex-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name="theme"
                  :value="option"
                  :checked="theme === option"
                  class="peer sr-only"
                  @change="updateTheme(option)"
                />
                <span
                  class="flex h-11 items-center justify-center gap-1.5 rounded-[7px] text-ui text-muted peer-checked:bg-elev peer-checked:text-text peer-checked:shadow-selected peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary workspace:h-7"
                >
                  <NavIcon
                    :name="option === 'light' ? 'sun' : 'moon'"
                    class="size-[15px]"
                  />
                  {{ option === "light" ? "Light" : "Dark" }}
                </span>
              </label>
            </fieldset>
          </div>
          <button
            ref="accountButton"
            type="button"
            aria-label="Account and appearance"
            title="Account and appearance"
            aria-haspopup="dialog"
            aria-controls="account-panel"
            :aria-expanded="accountOpen"
            :class="[
              isRail ? 'h-9 justify-center' : 'h-12 gap-2.5 px-2',
              accountOpen ? 'bg-hover' : '',
            ]"
            class="flex w-full items-center rounded-control text-left hover:bg-hover"
            @click="toggleAccountMethod"
          >
            <span
              aria-hidden="true"
              class="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary"
              >{{ githubUserData?.login?.[0]?.toUpperCase() || "G" }}</span
            >
            <span v-if="!isRail" class="min-w-0 flex-1">
              <span class="block truncate text-ui font-medium">{{
                githubUserData ? `@${githubUserData.login}` : "Account"
              }}</span>
              <span class="block truncate text-meta text-muted">{{
                githubUserData?.email ||
                (githubUserData ? "GitHub account" : "Not connected")
              }}</span>
            </span>
            <NavIcon
              v-if="!isRail"
              name="chev-down"
              class="size-3.5 text-muted"
            />
          </button>
        </div>
      </div>
    </nav>
    <SidebarResizeHandle
      v-if="!isNarrow && !isRail"
      :width="sidebarWidth"
      :update-width="(width) => (sidebarWidth = width)"
    />
  </aside>
</template>
