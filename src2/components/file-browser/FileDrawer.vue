<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { getBranchRoot, getBranchDirectory } from "@/api/index.js";
import useScrollbar from "@/helpers/use-scrollbar.js";
import ChangesList from "./ChangesList.vue";
import FileTree from "./FileTree.vue";
import FileIcon from "./FileIcon.vue";

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
});
const { isScrolling, scrollMethod } = useScrollbar();
const directories = ref({});
const expanded = ref({});
const source = ref(null);
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
  directories.value[path] = { loading: true, entries: [], error: false };
  try {
    if (!source.value) {
      const root = await getBranchRoot(props.session, signal);
      if (currentGeneration !== generation) return;
      source.value = root;
    }
    const entries = await getBranchDirectory(
      source.value,
      entry?.sha || source.value.treeSha,
      path,
      signal,
    );
    if (currentGeneration === generation)
      directories.value[path] = { loading: false, entries, error: false };
  } catch {
    if (currentGeneration === generation)
      directories.value[path] = { loading: false, entries: [], error: true };
  }
};
const toggleDirectoryMethod = (entry, retry = false) => {
  expanded.value[entry.path] = retry || !expanded.value[entry.path];
  if (expanded.value[entry.path] && (!directories.value[entry.path] || retry))
    loadDirectoryMethod(entry);
};
const loadRootMethod = () => {
  if (props.open && props.view === "files" && !directories.value[""])
    loadDirectoryMethod();
};
watch(
  () => props.session.headSha,
  () => {
    generation++;
    controller.abort();
    controller = new AbortController();
    directories.value = {};
    expanded.value = {};
    source.value = null;
    loadRootMethod();
  },
  { immediate: true },
);
watch(() => [props.open, props.view], loadRootMethod);
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
</script>

<template>
  <aside
    v-show="open"
    id="session-file-drawer"
    aria-label="Branch files"
    class="file-drawer flex w-drawer max-w-full shrink-0 flex-col border-r border-border-soft bg-ws-nav"
  >
    <div
      role="tablist"
      aria-label="Drawer view"
      class="m-2 flex shrink-0 gap-0.5 rounded-control bg-ws-seg p-[3px]"
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
    <div
      v-if="view === 'files'"
      class="flex shrink-0 items-center gap-1.5 pt-0.5 pr-2 pb-1.5 pl-3.5 text-meta text-muted"
    >
      <FileIcon name="branch" class="size-3.5" />
      <span class="truncate font-mono" :title="session.branch">{{
        session.branch
      }}</span>
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
          files. GitHub did not return the full list.
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
        <div
          v-if="directories['']?.loading"
          role="status"
          aria-label="Loading branch files"
          class="space-y-3 p-2 motion-safe:animate-pulse"
        >
          <div
            v-for="n in 8"
            :key="n"
            class="h-3 rounded bg-border"
            :class="n % 2 ? 'w-4/5' : 'w-3/5'"
          />
        </div>
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
        <FileTree
          v-else-if="directories['']?.entries?.length"
          :entries="directories[''].entries"
          :directories="directories"
          :expanded="expanded"
          :changes="changes"
          :active-path="activePath"
          :opened-paths="openedPaths"
          :on-toggle="toggleDirectoryMethod"
          :on-open="onOpen"
        />
        <p v-else class="p-2 text-ui text-muted">No files in this branch.</p>
      </template>
    </div>
  </aside>
</template>
