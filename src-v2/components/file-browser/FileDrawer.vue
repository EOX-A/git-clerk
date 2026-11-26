<script setup>
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from "vue";
import { getBranchDirectory } from "@/api/index.js";
import { fileDirectory } from "@/helpers/file-workspace.js";
import useScrollbar from "@/helpers/use-scrollbar.js";
import ChangesList from "./ChangesList.vue";
import FileTree from "./FileTree.vue";
import FileTreeActionMenu from "./FileTreeActionMenu.vue";
import FileTreeDeleteDialog from "./FileTreeDeleteDialog.vue";
import FileTreePlaceholder from "./FileTreePlaceholder.vue";
import FileIcon from "./FileIcon.vue";

const emit = defineEmits(["close"]);
const props = defineProps({
  session: { type: Object, required: true },
  open: Boolean,
  view: { type: String, required: true },
  files: { type: Array, required: true },
  loading: Boolean,
  error: { type: String, default: "" },
  incomplete: Boolean,
  activePath: { type: String, default: null },
  openedPaths: { type: Array, required: true },
  onOpen: { type: Function, required: true },
  onView: { type: Function, required: true },
  onRetry: { type: Function, required: true },
  canMutate: Boolean,
  onFileOperation: { type: Function, required: true },
});
const { isScrolling, scrollMethod } = useScrollbar();
const directories = ref({});
const expanded = ref({});
const newFileButton = ref(null);
const menu = shallowRef(null);
const edit = shallowRef(null);
const operationError = ref("");
const working = ref(false);
const rootFolder = { type: "folder", path: "" };
let actionID = 0;
let origin;
const changes = computed(() =>
  Object.fromEntries(props.files.map((file) => [file.path, file])),
);
let controller = new AbortController();
let generation = 0;

const loadDirectoryMethod = async (entry = null) => {
  const path = entry?.path || "";
  if (directories.value[path]?.loading) return;
  const currentGeneration = generation;
  const signal = controller.signal;
  directories.value[path] = {
    ...directories.value[path],
    loading: true,
    error: false,
  };
  try {
    const entries = await getBranchDirectory(props.session, path, signal);
    if (currentGeneration === generation)
      directories.value[path] = {
        loaded: true,
        loading: false,
        entries,
        error: false,
      };
  } catch {
    if (currentGeneration === generation)
      directories.value[path] = {
        ...directories.value[path],
        loading: false,
        error: true,
      };
  }
};
const toggleDirectoryMethod = (entry, retry = false) => {
  if (working.value) return;
  expanded.value[entry.path] = retry || !expanded.value[entry.path];
  if (
    expanded.value[entry.path] &&
    (!directories.value[entry.path]?.loaded || retry)
  )
    loadDirectoryMethod(entry);
  else if (
    !expanded.value[entry.path] &&
    edit.value &&
    (edit.value.entry.path === entry.path ||
      edit.value.entry.path.startsWith(entry.path + "/"))
  )
    finishOperationMethod();
};
const loadRootMethod = () => {
  if (!props.open || props.view !== "files") return;
  for (const path of [
    "",
    ...Object.keys(expanded.value).filter((key) => expanded.value[key]),
  ]) {
    const directory = directories.value[path];
    if (!(directory?.loaded || directory?.error)) loadDirectoryMethod({ path });
  }
};
watch(
  () => props.session.headSha,
  () => {
    generation++;
    controller.abort();
    controller = new AbortController();
    // Keep expanded folders and their rows visible while refreshing the tree.
    directories.value = Object.fromEntries(
      Object.entries(directories.value).map(([path, directory]) => [
        path,
        { entries: directory.entries },
      ]),
    );
    loadRootMethod();
  },
  { immediate: true },
);
watch([() => props.open, () => props.view, () => props.canMutate], () => {
  if (!props.open || props.view !== "files" || !props.canMutate) {
    closeMenuMethod(false);
    if (!working.value) edit.value = null;
  }
  loadRootMethod();
});
onUnmounted(() => {
  generation++;
  controller.abort();
});
const switchViewMethod = (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const view =
    event.key === "Home"
      ? "files"
      : event.key === "End"
        ? "changes"
        : props.view === "files"
          ? "changes"
          : "files";
  props.onView(view);
  event.currentTarget.querySelector(`[data-view="${view}"]`)?.focus();
};

const closeMenuMethod = (restore = true) => {
  const trigger = menu.value?.trigger;
  menu.value = null;
  if (restore && trigger?.isConnected) trigger.focus({ preventScroll: true });
};
const openMenuMethod = (event, entry) => {
  if (
    !props.canMutate ||
    working.value ||
    !["file", "folder"].includes(entry.type)
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  const trigger = event.currentTarget;
  const rect = trigger.getBoundingClientRect();
  menu.value = {
    id: ++actionID,
    entry,
    trigger,
    x: event.clientX ?? rect.left,
    y: event.clientY ?? rect.bottom,
  };
};
const beginOperationMethod = (action, entry, trigger) => {
  if (!props.canMutate || working.value) return;
  origin = trigger;
  closeMenuMethod(false);
  operationError.value = "";
  if (action === "create" && entry.path) {
    expanded.value[entry.path] = true;
    if (!directories.value[entry.path]?.loaded) loadDirectoryMethod(entry);
  }
  edit.value = { id: ++actionID, action, entry };
};
const finishOperationMethod = async () => {
  edit.value = null;
  operationError.value = "";
  await nextTick();
  const focusTarget = origin?.isConnected ? origin : newFileButton.value;
  focusTarget?.focus({ preventScroll: true });
};
const submitOperationMethod = async (name) => {
  if (!edit.value || !props.canMutate || working.value) return;
  const { action, entry } = edit.value;
  operationError.value = "";
  if (action === "rename" && name.trim() === entry.name) {
    finishOperationMethod();
    return;
  }
  if (action !== "delete") {
    const folder =
      action === "create"
        ? entry.path
        : fileDirectory(entry.path).replace(/\/$/, "");
    if (
      directories.value[folder]?.entries?.some(
        (item) => item.name === name.trim(),
      )
    ) {
      operationError.value = "A file or folder already has that name.";
      return;
    }
  }
  working.value = true;
  try {
    await props.onFileOperation(action, entry, name);
    await finishOperationMethod();
  } catch (error) {
    operationError.value = error.message || "Could not update this file.";
  } finally {
    working.value = false;
  }
};
const inlineEditor = computed(() =>
  edit.value && edit.value.action !== "delete"
    ? {
        ...edit.value,
        busy: working.value,
        error: operationError.value,
        onSubmit: submitOperationMethod,
        onCancel: finishOperationMethod,
      }
    : null,
);
</script>

<template>
  <aside
    v-show="open"
    id="session-file-drawer"
    aria-label="Branch files"
    class="file-drawer flex w-drawer max-w-full shrink-0 flex-col border-r border-border-soft bg-ws-nav"
  >
    <div class="m-2 flex shrink-0 items-center gap-1">
      <div
        role="tablist"
        aria-label="Drawer view"
        class="flex min-w-0 flex-1 gap-0.5 rounded-control bg-ws-seg p-[3px]"
        @keydown="switchViewMethod"
      >
        <button
          v-for="item in ['files', 'changes']"
          :key="item"
          type="button"
          role="tab"
          :data-view="item"
          :aria-selected="view === item"
          :tabindex="view === item ? 0 : -1"
          :aria-controls="`drawer-${item}`"
          class="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[7px] text-[12.5px] font-medium"
          :class="
            view === item
              ? 'bg-elev text-text shadow-selected'
              : 'text-muted hover:text-text'
          "
          @click="onView(item)"
        >
          {{ item === "files" ? "Files" : "Changes" }}
          <span
            v-if="item === 'changes'"
            class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-tint px-[5px] text-[10.5px] font-semibold text-primary"
            >{{ session.changedFiles }}</span
          >
        </button>
      </div>
      <button
        type="button"
        class="drawer-close hidden size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-ws-hover hover:text-text"
        aria-label="Close files panel"
        title="Close files panel"
        :disabled="working"
        @click="emit('close')"
      >
        <FileIcon name="close" class="size-4" />
      </button>
    </div>
    <div
      v-if="view === 'files'"
      class="flex shrink-0 items-center gap-1.5 pt-0.5 pr-2 pb-1.5 pl-3.5 text-meta text-muted"
    >
      <FileIcon name="branch" class="size-3.5" />
      <span class="truncate font-mono" :title="session.branch">{{
        session.branch
      }}</span>
      <button
        v-if="canMutate || working"
        ref="newFileButton"
        type="button"
        aria-label="New file in repository root"
        title="New file in repository root"
        :disabled="working"
        class="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-ws-hover disabled:opacity-40"
        @click="
          beginOperationMethod('create', rootFolder, $event.currentTarget)
        "
      >
        <FileIcon name="file-plus" class="size-3.5" />
      </button>
    </div>
    <p v-else class="shrink-0 px-3.5 pt-0.5 pb-2 text-meta text-muted">
      Files changed in PR #{{ session.number }}
    </p>
    <div
      :id="`drawer-${view}`"
      role="tabpanel"
      :aria-label="view === 'files' ? 'Files' : 'Changes'"
      class="nav-scrollbar min-h-0 flex-1 overflow-auto px-1.5 pb-2.5"
      :class="{ 'is-scrolling': isScrolling }"
      @scroll.passive="scrollMethod"
      @contextmenu.self="view === 'files' && openMenuMethod($event, rootFolder)"
    >
      <template v-if="view === 'changes'">
        <div
          v-if="loading && !files.length"
          role="status"
          aria-label="Loading changes"
          class="space-y-4 p-2"
        >
          <div
            v-for="n in 5"
            :key="n"
            class="space-y-2 motion-safe:animate-pulse"
          >
            <div class="h-3 w-4/5 rounded bg-border" />
            <div class="h-2 w-1/2 rounded bg-border-soft" />
          </div>
        </div>
        <div v-if="error" role="alert" class="p-2 text-ui text-closed">
          {{ error }}
          <button
            type="button"
            class="underline underline-offset-2"
            @click="onRetry"
          >
            Retry
          </button>
        </div>
        <p v-if="incomplete" role="status" class="p-2 text-meta text-warn">
          Showing {{ files.length }} of {{ session.changedFiles }} changed
          files. The Git broker did not return the full list.
        </p>
        <ChangesList
          :files="files"
          :active-path="activePath"
          :opened-paths="openedPaths"
          :on-open="onOpen"
        />
        <p
          v-if="!loading && !error && !files.length"
          class="p-2 text-[12.5px] text-muted"
        >
          No files have changed yet.
        </p>
      </template>
      <template v-else>
        <FileTree
          v-if="
            directories['']?.entries?.length ||
            inlineEditor?.action === 'create'
          "
          :entries="directories['']?.entries || []"
          :directories="directories"
          :expanded="expanded"
          :changes="changes"
          :active-path="activePath"
          :opened-paths="openedPaths"
          :on-toggle="toggleDirectoryMethod"
          :on-open="onOpen"
          :editor="inlineEditor"
          :on-menu="canMutate && !working ? openMenuMethod : null"
        />
        <FileTreePlaceholder
          v-if="directories['']?.loading && !directories['']?.entries?.length"
        />
        <div
          v-else-if="directories['']?.error"
          role="alert"
          class="p-2 text-ui text-closed"
        >
          Could not load branch files.
          <button
            type="button"
            class="underline underline-offset-2"
            @click="loadDirectoryMethod()"
          >
            Retry
          </button>
        </div>
        <p
          v-else-if="!directories['']?.entries?.length && !inlineEditor"
          class="p-2 text-ui text-muted"
        >
          No files in this branch.
        </p>
      </template>
    </div>
    <FileTreeActionMenu
      v-if="menu"
      :key="menu.id"
      :entry="menu.entry"
      :anchor="menu"
      :on-action="
        (action) => beginOperationMethod(action, menu.entry, menu.trigger)
      "
      :on-close="closeMenuMethod"
    />
    <FileTreeDeleteDialog
      v-if="edit?.action === 'delete'"
      :path="edit.entry.path"
      :busy="working"
      :error="operationError"
      :on-cancel="finishOperationMethod"
      :on-delete="submitOperationMethod"
    />
  </aside>
</template>
