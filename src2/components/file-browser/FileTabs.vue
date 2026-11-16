<script setup>
import { nextTick, ref, watch } from "vue";
import { fileName } from "@/helpers/file-workspace.js";
import FileIcon from "./FileIcon.vue";
import FileTabsPlaceholder from "./FileTabsPlaceholder.vue";

const props = defineProps({
  tabs: { type: Array, required: true },
  dirtyPaths: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
  drawerOpen: Boolean,
  changeCount: { type: Number, default: 0 },
  loading: Boolean,
  onSelect: { type: Function, required: true },
  onClose: { type: Function, required: true },
  onToggleDrawer: { type: Function, required: true },
});
const tabList = ref(null);
const drawerButton = ref(null);
const focusTabMethod = async () => {
  await nextTick();
  (
    tabList.value?.querySelector('[aria-selected="true"]') || drawerButton.value
  )?.focus();
};
const keydownMethod = async (event, index) => {
  let next = index;
  if (event.key === "ArrowRight") next = (index + 1) % props.tabs.length;
  else if (event.key === "ArrowLeft")
    next = (index + props.tabs.length - 1) % props.tabs.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = props.tabs.length - 1;
  else if (event.key === "Delete") {
    event.preventDefault();
    await props.onClose(props.tabs[index].id);
    await focusTabMethod();
    return;
  } else return;
  event.preventDefault();
  props.onSelect(props.tabs[next].id);
  await focusTabMethod();
};
watch(
  () => props.activeId,
  async () => {
    await nextTick();
    tabList.value
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  },
);
</script>

<template>
  <div class="flex h-10 shrink-0 border-b border-border-soft bg-ws-nav">
    <button
      ref="drawerButton"
      type="button"
      :aria-label="`${drawerOpen ? 'Hide' : 'Show'} files panel (${changeCount} changes)`"
      :title="`${drawerOpen ? 'Hide' : 'Show'} files panel (${changeCount} changes)`"
      :aria-expanded="drawerOpen"
      aria-controls="session-file-drawer"
      class="relative flex w-11 shrink-0 items-center justify-center border-r border-border-soft hover:bg-ws-hover"
      :class="drawerOpen ? 'bg-ws-hover text-text' : 'text-muted'"
      @click="onToggleDrawer"
    >
      <FileIcon name="file-diff" class="size-[18px]" />
      <span
        v-if="changeCount"
        class="absolute top-[9px] right-2.5 size-[7px] rounded-full bg-open ring-2 ring-ws-nav"
      />
    </button>
    <div
      ref="tabList"
      role="tablist"
      aria-label="Open files"
      class="nav-scrollbar flex min-w-0 flex-1 overflow-x-auto"
      :aria-busy="loading"
    >
      <div
        v-for="(tab, index) in tabs"
        :key="tab.id"
        class="file-tab flex basis-[200px] items-center overflow-hidden border-r border-border-soft"
        :class="
          tab.id === activeId
            ? 'active min-w-[104px] bg-elev text-text shadow-[inset_0_2px_0_var(--primary)]'
            : 'min-w-10 text-muted hover:bg-ws-hover'
        "
      >
        <button
          type="button"
          role="tab"
          :aria-selected="tab.id === activeId"
          :tabindex="tab.id === activeId ? 0 : -1"
          :title="tab.path"
          class="flex h-full min-w-0 flex-1 items-center gap-[7px] pr-1 pl-3 text-[12.5px]"
          @click="onSelect(tab.id)"
          @keydown="keydownMethod($event, index)"
        >
          <span
            v-if="dirtyPaths.includes(tab.path)"
            role="img"
            aria-label="Unsaved changes"
            class="size-[7px] shrink-0 rounded-full bg-dirty"
          />
          <FileIcon class="size-3.5" />
          <span class="truncate">{{ fileName(tab.path) }}</span>
        </button>
        <button
          type="button"
          :aria-label="`Close ${tab.path}`"
          :title="`Close ${tab.path}`"
          class="file-tab-close mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-ws-hover hover:text-text"
          @click="
            async () => {
              await onClose(tab.id);
              focusTabMethod();
            }
          "
        >
          <FileIcon name="close" class="size-[13px]" />
        </button>
      </div>
      <FileTabsPlaceholder
        v-if="loading && !tabs.length"
        :count="changeCount || 3"
      />
    </div>
  </div>
</template>

<style scoped>
.file-tab {
  container-type: inline-size;
}
@container (max-width: 92px) {
  .file-tab:not(.active) .file-tab-close {
    display: none;
  }
}
</style>
