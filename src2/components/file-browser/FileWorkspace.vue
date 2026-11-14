<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { getSessionFiles } from "@/api/index.js";
import {
  changedFileTabs,
  closeFileTab,
  fileTab,
} from "@/helpers/file-workspace.js";
import FileTabs from "./FileTabs.vue";
import FileDrawer from "./FileDrawer.vue";

const props = defineProps({ session: { type: Object, required: true } });
const files = ref([]);
const tabs = ref([]);
const activeID = ref(null);
const drawerOpen = ref(false);
const drawerView = ref("changes");
const loading = ref(false);
const error = ref("");
const incomplete = ref(false);
const activePath = computed(
  () => tabs.value.find((tab) => tab.id === activeID.value)?.path || null,
);
const openedPaths = computed(() => tabs.value.map((tab) => tab.path));
let initialized = false;
let requestID = 0;
let controller;

const loadChangesMethod = async () => {
  const currentRequest = ++requestID;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = "";
  try {
    const result = await getSessionFiles(props.session, controller.signal);
    if (currentRequest !== requestID) return;
    files.value = result.files;
    incomplete.value = result.incomplete;
    // Auto-open once per session; refreshes preserve the user's closed tabs.
    if (!initialized) {
      tabs.value = changedFileTabs(result.files);
      activeID.value = tabs.value[0]?.id || null;
      initialized = true;
      if (!tabs.value.length) {
        drawerView.value = "files";
        drawerOpen.value = true;
      }
    }
  } catch {
    if (currentRequest === requestID)
      error.value = "Could not load changed files.";
  } finally {
    if (currentRequest === requestID) loading.value = false;
  }
};
const openFileMethod = (path) => {
  const tab = fileTab(path);
  if (!tabs.value.some((item) => item.id === tab.id)) tabs.value.push(tab);
  activeID.value = tab.id;
};
const closeDrawerMethod = (event) => {
  drawerOpen.value = false;
  event.currentTarget
    .closest(".file-workspace")
    ?.querySelector('[aria-controls="session-file-drawer"]')
    ?.focus();
};
const closeFileMethod = (id) => {
  const result = closeFileTab(tabs.value, activeID.value, id);
  tabs.value = result.tabs;
  activeID.value = result.activeID;
  if (!tabs.value.length) {
    drawerView.value = files.value.length ? "changes" : "files";
    drawerOpen.value = true;
  }
};
watch(
  () => [
    props.session.headSha,
    props.session.changedFiles,
    props.session.updatedAt,
  ],
  loadChangesMethod,
  { immediate: true },
);
onUnmounted(() => {
  requestID++;
  controller?.abort();
});
</script>

<template>
  <div class="file-workspace flex min-h-0 flex-1 flex-col">
    <FileTabs
      :tabs="tabs"
      :active-id="activeID"
      :drawer-open="drawerOpen"
      :change-count="session.changedFiles"
      :loading="loading"
      :on-select="(id) => (activeID = id)"
      :on-close="closeFileMethod"
      :on-toggle-drawer="() => (drawerOpen = !drawerOpen)"
    />
    <div
      v-if="error && !drawerOpen"
      role="alert"
      class="px-4 py-2 text-ui text-closed"
    >
      {{ error }}
      <button
        type="button"
        class="underline underline-offset-2"
        @click="loadChangesMethod"
      >
        Retry
      </button>
    </div>
    <div class="relative flex min-h-0 flex-1" @keydown.esc="closeDrawerMethod">
      <FileDrawer
        :session="session"
        :open="drawerOpen"
        :view="drawerView"
        :files="files"
        :loading="loading"
        :error="error"
        :incomplete="incomplete"
        :active-path="activePath"
        :opened-paths="openedPaths"
        :on-open="openFileMethod"
        :on-view="(view) => (drawerView = view)"
        :on-retry="loadChangesMethod"
      />
      <!-- File content, preview and diff views are intentionally a later stage. -->
    </div>
  </div>
</template>

<style scoped>
.file-workspace {
  container-type: inline-size;
}
@container (max-width: 620px) {
  :deep(.file-drawer) {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 6;
    box-shadow: var(--shadow-floating);
  }
}
</style>
