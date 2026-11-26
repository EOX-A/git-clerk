<script setup>
import {
  computed,
  nextTick,
  inject,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  toRef,
  watch,
} from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
import {
  fileRepositoryUrl,
  toggleFileMode,
  matchFileSchema,
  matchesFilePath,
  previewAddress,
  formValue,
} from "@/helpers/file-editor.js";
import { getChatConfig } from "@/helpers/chat-config.js";
import { FileContent, FileDialog, FileToolbar } from "@/components/file";
import useFileDocuments from "@/helpers/use-file-documents.js";
import {
  branchFilePath,
  createFileInSession,
  getSessionFiles,
  removeFileFromSession,
  renameFileInSession,
} from "@/api/index.js";
import {
  changedFileTabs,
  handleFileHistoryShortcut,
  closeFileTab,
  fileDirectory,
  fileTab,
} from "@/helpers/file-workspace.js";
import FileTabs from "./FileTabs.vue";
import FileDrawer from "./FileDrawer.vue";

const props = defineProps({
  session: { type: Object, default: null },
  draftFiles: { type: Array, default: () => [] },
  publication: { type: Object, default: null },
  active: { type: Boolean, default: true },
  onReveal: { type: Function, default: null },
  onSaved: { type: Function, required: true },
  onDirtyChange: { type: Function, required: true },
  onOperationChange: { type: Function, default: null },
});
const workspace = ref(null);
const files = ref([]);
const tabs = ref([]);
const activeID = ref(null);
const drawerOpen = ref(false);
const drawerView = ref("changes");
const loading = ref(false);
const error = ref("");
const incomplete = ref(false);
const fileOperationPending = ref(false);
const confirmedHead = shallowRef(null);
const fileSession = computed(() => {
  const headSha = confirmedHead.value?.commitSha;
  return headSha && headSha !== props.session?.headSha
    ? { ...props.session, headSha }
    : props.session;
});
watch(
  () => props.session?.headSha,
  (headSha) => {
    const confirmed = confirmedHead.value;
    if (
      confirmed &&
      headSha &&
      headSha !== confirmed.commitSha &&
      !confirmed.previous.has(headSha)
    )
      confirmedHead.value = null;
  },
);
const draftFile = computed(() => props.draftFiles.at(-1));
const draftTabs = computed(() => changedFileTabs(props.draftFiles));
const promotedPath = ref(null);
const promotedDocument = shallowRef(null);
const outputTemplate = getChatConfig().preset.outputFile?.replace(/^\//, "");
const draftDocument = computed(() => {
  const file = draftFile.value;
  const text =
    file?.source ??
    (typeof file?.content === "string"
      ? file.content
      : JSON.stringify(file?.content, null, 2)) ??
    "";
  const meta = file && matchFileSchema(file.path);
  let preview = previewAddress(meta?.preview, window.location.href);
  if (file?.source !== undefined) preview = null;
  if (preview && !meta.generic) {
    try {
      formValue(text, meta);
    } catch {
      preview = null;
    }
  }
  return {
    loaded: true,
    text,
    savedText: text,
    meta,
    preview,
    mode: preview ? "none" : "source",
    history: [],
    historyIndex: 0,
  };
});
const activePath = computed(() =>
  props.session ? activeID.value : draftFile.value?.path,
);
// Naming a single configured output can change its path, but it is still the same preview.
const contentKey = computed(() => {
  const streamedPath = props.session
    ? promotedPath.value
    : draftFile.value?.path;
  return streamedPath &&
    streamedPath === activePath.value &&
    outputTemplate &&
    matchesFilePath(streamedPath, outputTemplate)
    ? outputTemplate
    : activePath.value;
});
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
  fileSession,
  files,
  props.onSaved,
  snackbar,
  toRef(props, "publication"),
);
const canMutateFiles = computed(
  () =>
    props.active &&
    props.session?.canEdit &&
    !Object.values(documents.value).some((doc) => doc.saving),
);
const editorDocument = computed(() => documents.value[activePath.value]);
const showingDraft = computed(
  () =>
    !props.session ||
    (activePath.value === promotedPath.value &&
      Boolean(promotedDocument.value)),
);
const activeDocument = computed(() =>
  !props.session
    ? draftDocument.value
    : showingDraft.value
      ? promotedDocument.value
      : editorDocument.value,
);
watch(
  () => [
    activePath.value,
    editorDocument.value?.loaded,
    editorDocument.value?.error,
  ],
  ([path, loaded, failed]) => {
    if (path !== promotedPath.value || loaded || failed)
      promotedDocument.value = null;
  },
);
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
const editModes = computed(() => {
  const meta = activeDocument.value?.meta;
  return meta?.schema && !meta.generic ? ["editor", "source"] : ["source"];
});
const togglePaneMethod = async () => {
  const doc = activeDocument.value;
  const mode = doc.mode === "none" ? editModes.value[0] : doc.mode;
  doc.mode = toggleFileMode(doc.mode, mode, doc.preview);
  if (doc.mode !== "none") {
    await nextTick();
    const pane = workspace.value?.querySelector("#file-edit-pane");
    (pane?.querySelector('[aria-selected="true"]') || pane)?.focus();
  }
};
const closePaneMethod = () => {
  workspace.value?.querySelector('[aria-controls="file-edit-pane"]')?.focus();
  activeDocument.value.mode = "none";
};
const saveActiveMethod = async (path = activePath.value) => {
  if (!path || fileOperationPending.value) return false;
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
const guardMethod = () =>
  fileOperationPending.value ? false : confirmMethod(dirtyPaths.value);
onBeforeRouteLeave(guardMethod);
onBeforeRouteUpdate((to, from) =>
  to.params.sessionNumber !== from.params.sessionNumber ? guardMethod() : true,
);
const unloadMethod = (event) => {
  if (fileOperationPending.value || dirtyPaths.value.length) {
    event.preventDefault();
    event.returnValue = "";
  }
};
const activeHistoryMethod = (direction) => {
  const doc = activeDocument.value;
  if (
    !props.active ||
    !props.session?.canEdit ||
    showingDraft.value ||
    fileOperationPending.value ||
    pending.value ||
    validation.value.length ||
    !doc?.loaded ||
    doc.saving ||
    doc.removed ||
    doc.diff ||
    doc.unavailable ||
    activeChange.value?.status === "removed"
  )
    return false;
  historyMethod(activePath.value, direction);
  return true;
};
const historyKeyMethod = (event) => {
  const target = event.target;
  if (
    target !== document.body &&
    target !== document.documentElement &&
    !workspace.value?.contains(target)
  )
    return;
  if (target.closest?.("dialog, .file-drawer input, .file-drawer textarea"))
    return;
  handleFileHistoryShortcut(event, activeHistoryMethod);
};
const saveKeyMethod = (event) => {
  if (!props.active) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!pending.value && !validation.value.length) saveActiveMethod();
  }
};
watch([() => fileSession.value?.headSha, () => props.publication], () => {
  if (!fileSession.value) return;
  for (const [path, doc] of Object.entries(documents.value)) {
    if (!doc.loaded || doc.saving || doc.headSha === fileSession.value.headSha)
      continue;
    if (dirtyPaths.value.includes(path)) doc.remoteChanged = true;
    else if (!applyPublicationMethod(path))
      loadMethod(path, { background: true });
  }
});
watch(
  () => props.session,
  (session, previous) => {
    if (!session || previous || !props.publication) return;
    // Keep the streamed tab and its rendered document while the editor loads schema metadata.
    tabs.value = changedFileTabs(
      Object.keys(props.publication.documents || {}).map(fileTab),
    );
    const file = draftFile.value;
    if (file && Object.hasOwn(props.publication.documents || {}, file.path)) {
      promotedPath.value = file.path;
      promotedDocument.value = draftDocument.value;
    }
    activeID.value = promotedPath.value || tabs.value[0]?.id || null;
  },
);
watch([activePath, () => Boolean(props.session)], ([path, saved]) => {
  if (path && saved) loadMethod(path);
});
watch(dirtyPaths, (paths) => props.onDirtyChange(paths.length > 0), {
  immediate: true,
});
onMounted(() => {
  window.addEventListener("beforeunload", unloadMethod);
  window.addEventListener("keydown", saveKeyMethod);
  window.addEventListener("keydown", historyKeyMethod, true);
});
const initialized = ref(false);
let requestID = 0;
let controller;

const loadChangesMethod = async () => {
  if (!props.session) return;
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
    if (!initialized.value) {
      // A chat file link may have opened a tab while this first request was pending.
      const existing = new Set(tabs.value.map((tab) => tab.id));
      tabs.value = [
        ...tabs.value,
        ...changedFileTabs(result.files).filter((tab) => !existing.has(tab.id)),
      ];
      activeID.value ||= tabs.value[0]?.id || null;
      initialized.value = true;
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
const closeDrawerMethod = () => {
  if (!drawerOpen.value || fileOperationPending.value) return;
  drawerOpen.value = false;
  workspace.value
    ?.querySelector('[aria-controls="session-file-drawer"]')
    ?.focus();
};
const toggleDrawerMethod = async () => {
  if (fileOperationPending.value) return;
  if (drawerOpen.value) return closeDrawerMethod();
  drawerOpen.value = true;
  await nextTick();
  workspace.value
    ?.querySelector('.file-drawer [role="tab"][aria-selected="true"]')
    ?.focus();
};
const closeFileMethod = async (id) => {
  if (fileOperationPending.value || documents.value[id]?.saving) return;
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
const fileOperationMethod = async (action, entry, name) => {
  if (!canMutateFiles.value || fileOperationPending.value)
    throw new Error("Wait for the current file action before trying again.");
  const { path, sha } = entry;
  if (action !== "create" && dirtyPaths.value.includes(path))
    throw new Error("Save or discard this file's edits before continuing.");
  const destination =
    action === "delete"
      ? null
      : branchFilePath(
          action === "create" ? path : fileDirectory(path).replace(/\/$/, ""),
          name,
        );
  const session = fileSession.value;
  fileOperationPending.value = true;
  props.onOperationChange?.(true);
  try {
    let result;
    if (action === "create")
      result = await createFileInSession(session, destination);
    else if (action === "rename")
      result = await renameFileInSession(session, path, destination, sha);
    else if (action === "delete")
      result = await removeFileFromSession(session, path, sha);
    if (!result) return;

    // Repo and file reads can use the commit now, even if the PR API still
    // reports the old head or the intermediate copy commit during a rename.
    const previous = new Set([
      ...(confirmedHead.value?.previous || []),
      props.session?.headSha,
      session.headSha,
      result.copyCommitSha,
    ]);
    confirmedHead.value = { commitSha: result.commitSha, previous };
    if (action !== "create") {
      forgetMethod(path);
      const result = closeFileTab(tabs.value, activeID.value, path);
      tabs.value = result.tabs;
      activeID.value = result.activeID;
    }
    if (destination) {
      // A previously removed file can still have an open tab for its base version.
      forgetMethod(destination);
      files.value = files.value.filter(
        (file) => file.path !== destination || file.status !== "removed",
      );
      openFileMethod(destination);
      loadMethod(destination);
    }
    void props.onSaved();
    snackbar.value = {
      text:
        action === "create"
          ? "File created"
          : action === "rename"
            ? "File renamed"
            : "File deleted",
      description: destination || path,
      status: "success",
    };
  } catch (cause) {
    if (cause.refresh || cause.status >= 500 || cause.status === 409)
      await props.onSaved();
    throw cause;
  } finally {
    fileOperationPending.value = false;
    props.onOperationChange?.(false);
  }
};
// Compare revisions and counts by value so metadata refreshes don't reload files.
watch(
  [
    () => props.session?.headSha || props.session?.branch,
    () => props.session?.baseSha || props.session?.baseBranch,
    () => props.session?.changedFiles,
  ],
  loadChangesMethod,
  { immediate: true },
);
onUnmounted(() => {
  requestID++;
  controller?.abort();
  window.removeEventListener("beforeunload", unloadMethod);
  window.removeEventListener("keydown", saveKeyMethod);
  window.removeEventListener("keydown", historyKeyMethod, true);
  props.onDirtyChange(false);
  props.onOperationChange?.(false);
  finishDialogMethod(false);
});
</script>

<template>
  <div
    ref="workspace"
    class="file-workspace relative flex min-h-0 min-w-0 flex-1"
    :role="!session ? 'region' : undefined"
    :aria-label="!session ? 'Temporary file preview' : undefined"
    @keydown.esc="closeDrawerMethod"
  >
    <FileDrawer
      v-if="session"
      :session="fileSession"
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
      :can-mutate="canMutateFiles"
      :on-file-operation="fileOperationMethod"
      @close="closeDrawerMethod"
    />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <FileTabs
        :tabs="session ? tabs : draftTabs"
        :disabled="!session"
        :dirty-paths="dirtyPaths"
        :active-id="activePath"
        :drawer-open="drawerOpen"
        :change-count="session?.changedFiles ?? draftTabs.length"
        :loading="session ? loading && !initialized : !draftTabs.length"
        :on-select="(id) => (activeID = id)"
        :on-close="closeFileMethod"
        :on-toggle-drawer="toggleDrawerMethod"
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
        v-if="activePath || !session"
        :temporary="Boolean(showingDraft)"
        :path="activePath || ''"
        :doc="activeDocument"
        :inert="fileOperationPending || undefined"
        :session="fileSession"
        :dirty="dirtyPaths.includes(activePath)"
        :changed="activeChange"
        :read-only="
          Boolean(session && !session.canEdit) ||
          activeChange?.status === 'removed'
        "
        :repository-url="
          session &&
          fileRepositoryUrl(session, activePath, activeDocument, activeChange)
        "
        :on-toggle-pane="togglePaneMethod"
        :on-save="() => saveActiveMethod()"
        :on-diff="
          () => {
            if (activeDocument) activeDocument.diff = !activeDocument.diff;
          }
        "
        :on-history="activeHistoryMethod"
      />
      <FileContent
        v-if="activePath"
        :key="contentKey"
        :path="activePath"
        :doc="activeDocument"
        :read-only="Boolean(showingDraft)"
        :inert="fileOperationPending || undefined"
        :session="fileSession"
        :changed="activeChange"
        :modes="editModes"
        :on-select-mode="
          showingDraft ? null : (mode) => (activeDocument.mode = mode)
        "
        :on-close-pane="showingDraft ? null : closePaneMethod"
        :on-change="
          (text) => {
            if (!fileOperationPending) changeMethod(activePath, text);
          }
        "
        :on-retry="
          () => {
            if (!dirtyPaths.includes(activePath))
              loadMethod(activePath, { force: true, background: true });
            else
              snackbar = {
                text: 'Close this tab and save or discard its draft before reloading.',
                status: 'error',
              };
          }
        "
        :on-history="activeHistoryMethod"
      />
      <p v-else-if="!session" class="p-5 text-ui text-muted" role="status">
        Waiting for file content…
      </p>
      <div
        v-else-if="initialized || !loading"
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
  :deep(.drawer-close) {
    display: inline-flex;
  }
  :deep(.file-drawer) {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 6;
    box-shadow: var(--shadow-floating);
  }
}
</style>
