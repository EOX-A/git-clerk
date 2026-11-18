<script setup>
import {
  computed,
  nextTick,
  inject,
  onMounted,
  onUnmounted,
  ref,
  toRef,
  watch,
} from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
import { fileRepositoryUrl, toggleFileMode } from "@/helpers/file-editor.js";
import { FileContent, FileDialog, FileToolbar } from "@/components/file";
import useFileDocuments from "@/helpers/use-file-documents.js";
import { getSessionFiles } from "@/api/index.js";
import {
  changedFileTabs,
  closeFileTab,
  fileTab,
} from "@/helpers/file-workspace.js";
import FileTabs from "./FileTabs.vue";
import FileDrawer from "./FileDrawer.vue";

const props = defineProps({
  session: { type: Object, required: true },
  publication: { type: Object, default: null },
  active: { type: Boolean, default: true },
  onReveal: { type: Function, default: null },
  onSaved: { type: Function, required: true },
  onDirtyChange: { type: Function, required: true },
});
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
const snackbar = inject("set-snackbar");
const {
  documents,
  dirtyPaths,
  loadMethod,
  applyPublicationMethod,
  changeMethod,
  historyMethod,
  saveMethod,
  forgetMethod,
} = useFileDocuments(
  toRef(props, "session"),
  files,
  props.onSaved,
  snackbar,
  toRef(props, "publication"),
);
const activeDocument = computed(() => documents.value[activePath.value]);
const activeChange = computed(
  () => files.value.find((file) => file.path === activePath.value) || null,
);
const pending = ref(null);
const savingDialog = ref(false);
const validation = ref([]);
const finishDialogMethod = (result) => {
  const resolve = pending.value?.resolve;
  pending.value = null;
  resolve?.(result);
};
const confirmMethod = async (paths) => {
  if (pending.value) return Promise.resolve(false);
  if (!paths.length) return Promise.resolve(true);
  props.onReveal?.();
  await nextTick();
  return new Promise(
    (resolve) => (pending.value = { paths: [...paths], resolve }),
  );
};
const saveActiveMethod = async (path = activePath.value) => {
  if (!path) return false;
  const saved = await saveMethod(path);
  if (documents.value[path]?.validation.length) {
    activeID.value = path;
    validation.value = documents.value[path].validation;
  }
  return saved;
};
const savePendingMethod = async () => {
  savingDialog.value = true;
  for (const path of pending.value.paths) {
    if (!(await saveActiveMethod(path))) {
      savingDialog.value = false;
      finishDialogMethod(false);
      return;
    }
  }
  savingDialog.value = false;
  finishDialogMethod(true);
};
const guardMethod = () => confirmMethod(dirtyPaths.value);
onBeforeRouteLeave(guardMethod);
onBeforeRouteUpdate((to, from) =>
  to.params.sessionNumber !== from.params.sessionNumber ? guardMethod() : true,
);
const unloadMethod = (event) => {
  if (dirtyPaths.value.length) {
    event.preventDefault();
    event.returnValue = "";
  }
};
const saveKeyMethod = (event) => {
  if (!props.active) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!pending.value && !validation.value.length) saveActiveMethod();
  }
};
watch(
  () => [props.session.headSha, props.publication],
  () => {
    for (const [path, doc] of Object.entries(documents.value)) {
      if (!doc.loaded || doc.saving || doc.headSha === props.session.headSha)
        continue;
      if (dirtyPaths.value.includes(path)) doc.remoteChanged = true;
      else if (!applyPublicationMethod(path)) loadMethod(path, true);
    }
  },
);
watch(activePath, (path) => {
  if (path) loadMethod(path);
});
watch(dirtyPaths, (paths) => props.onDirtyChange(paths.length > 0), {
  immediate: true,
});
onMounted(() => {
  window.addEventListener("beforeunload", unloadMethod);
  window.addEventListener("keydown", saveKeyMethod);
});
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
      // A chat file link may have opened a tab while this first request was pending.
      const existing = new Set(tabs.value.map((tab) => tab.id));
      tabs.value = [
        ...tabs.value,
        ...changedFileTabs(result.files).filter((tab) => !existing.has(tab.id)),
      ];
      activeID.value ||= tabs.value[0]?.id || null;
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
  if (documents.value[path]) documents.value[path].diff = false;
  const tab = fileTab(path);
  if (!tabs.value.some((item) => item.id === tab.id)) tabs.value.push(tab);
  activeID.value = tab.id;
};
const openChangesMethod = () => {
  drawerView.value = "changes";
  drawerOpen.value = true;
};
defineExpose({
  openFile: openFileMethod,
  openChanges: openChangesMethod,
});
const closeDrawerMethod = (event) => {
  drawerOpen.value = false;
  event.currentTarget
    .closest(".file-workspace")
    ?.querySelector('[aria-controls="session-file-drawer"]')
    ?.focus();
};
const closeFileMethod = async (id) => {
  if (documents.value[id]?.saving) return;
  if (!(await confirmMethod(dirtyPaths.value.includes(id) ? [id] : []))) return;
  forgetMethod(id);
  const result = closeFileTab(tabs.value, activeID.value, id);
  tabs.value = result.tabs;
  activeID.value = result.activeID;
  if (!tabs.value.length) {
    drawerView.value = files.value.length ? "changes" : "files";
    drawerOpen.value = true;
  }
};
// Compare revisions and counts by value so metadata refreshes don't reload files.
watch(
  [
    () => props.session.headSha || props.session.branch,
    () => props.session.baseSha || props.session.baseBranch,
    () => props.session.changedFiles,
  ],
  loadChangesMethod,
  { immediate: true },
);
onUnmounted(() => {
  requestID++;
  controller?.abort();
  window.removeEventListener("beforeunload", unloadMethod);
  window.removeEventListener("keydown", saveKeyMethod);
  props.onDirtyChange(false);
  finishDialogMethod(false);
});
</script>

<template>
  <div class="file-workspace flex min-h-0 flex-1 flex-col">
    <FileTabs
      :tabs="tabs"
      :dirty-paths="dirtyPaths"
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
    <FileToolbar
      v-if="activePath"
      :path="activePath"
      :doc="activeDocument"
      :session="session"
      :dirty="dirtyPaths.includes(activePath)"
      :changed="activeChange"
      :read-only="!session.canEdit || activeChange?.status === 'removed'"
      :repository-url="
        fileRepositoryUrl(session, activePath, activeDocument, activeChange)
      "
      :on-mode="
        (mode) =>
          (activeDocument.mode = toggleFileMode(
            activeDocument.mode,
            mode,
            activeDocument.preview,
          ))
      "
      :on-save="() => saveActiveMethod()"
      :on-diff="
        () => {
          if (activeDocument) activeDocument.diff = !activeDocument.diff;
        }
      "
      :on-history="(direction) => historyMethod(activePath, direction)"
    />
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
      <FileContent
        v-if="activePath"
        :key="activePath"
        :path="activePath"
        :doc="activeDocument"
        :session="session"
        :changed="activeChange"
        :on-change="(text) => changeMethod(activePath, text)"
        :on-retry="
          () => {
            if (!dirtyPaths.includes(activePath)) loadMethod(activePath, true);
            else
              snackbar = {
                text: 'Close this tab and save or discard its draft before reloading.',
                status: 'error',
              };
          }
        "
        :on-history="(direction) => historyMethod(activePath, direction)"
      />
      <div
        v-else-if="!loading"
        class="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
      >
        <p class="text-sm font-semibold">Open a file to view it</p>
        <p class="text-ui text-muted">
          {{
            files.length
              ? "Pick a changed file from the Changes list."
              : "Pick a file from the Files list."
          }}
        </p>
      </div>
    </div>
    <FileDialog
      v-if="pending"
      :paths="pending.paths"
      :session-number="session.number"
      :busy="savingDialog"
      :can-save="session.canEdit"
      :on-cancel="() => finishDialogMethod(false)"
      :on-discard="() => finishDialogMethod(true)"
      :on-save="savePendingMethod"
    />
    <FileDialog
      v-else-if="validation.length"
      :errors="validation"
      :session-number="session.number"
      :on-cancel="() => (validation = [])"
    />
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
