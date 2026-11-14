<script setup>
import { FILE_STATUS } from "@/helpers/file-workspace.js";
import FileIcon from "./FileIcon.vue";

defineProps({
  entries: { type: Array, required: true },
  directories: { type: Object, required: true },
  expanded: { type: Object, required: true },
  changes: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  activePath: { type: String, default: null },
  openedPaths: { type: Array, required: true },
  onToggle: { type: Function, required: true },
  onOpen: { type: Function, required: true },
});
</script>

<template>
  <ul>
    <li v-for="entry in entries" :key="entry.path">
      <button
        type="button"
        :title="
          entry.type === 'submodule' ? `${entry.path} (submodule)` : entry.path
        "
        :aria-expanded="
          entry.type === 'folder' ? Boolean(expanded[entry.path]) : undefined
        "
        :aria-current="activePath === entry.path ? 'true' : undefined"
        :disabled="entry.type === 'submodule'"
        class="flex h-7 w-full items-center gap-[5px] rounded-md pr-2 text-left text-[12.5px] hover:bg-ws-hover disabled:cursor-default disabled:opacity-60"
        :class="activePath === entry.path ? 'bg-tint' : ''"
        :style="{ paddingLeft: `${8 + depth * 14}px` }"
        @click="entry.type === 'folder' ? onToggle(entry) : onOpen(entry.path)"
      >
        <FileIcon
          v-if="entry.type === 'folder'"
          name="chevron"
          class="size-[13px] text-muted"
          :class="expanded[entry.path] ? 'rotate-90' : ''"
        />
        <span v-else class="w-[13px] shrink-0" />
        <FileIcon
          :name="entry.type === 'folder' ? 'folder' : 'file'"
          class="size-[15px] text-muted"
        />
        <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
        <span
          v-if="openedPaths.includes(entry.path)"
          class="size-1.5 shrink-0 rounded-full bg-primary"
          title="Open in tabs"
          aria-label="Open in tabs"
        />
        <span
          v-if="changes[entry.path]"
          class="font-mono text-[11px] font-medium"
          :class="
            (FILE_STATUS[changes[entry.path].status] || FILE_STATUS.changed)
              .color
          "
          :aria-label="
            (FILE_STATUS[changes[entry.path].status] || FILE_STATUS.changed)
              .label
          "
          >{{
            (FILE_STATUS[changes[entry.path].status] || FILE_STATUS.changed)
              .letter
          }}</span
        >
      </button>
      <template v-if="entry.type === 'folder' && expanded[entry.path]">
        <div
          v-if="directories[entry.path]?.loading"
          role="status"
          class="px-6 py-2 text-meta text-muted"
        >
          Loading folder…
        </div>
        <button
          v-else-if="directories[entry.path]?.error"
          type="button"
          class="px-6 py-2 text-meta text-closed"
          @click="onToggle(entry, true)"
        >
          Could not load folder. Retry
        </button>
        <FileTree
          v-else-if="directories[entry.path]?.entries?.length"
          :entries="directories[entry.path].entries"
          :directories="directories"
          :expanded="expanded"
          :changes="changes"
          :depth="depth + 1"
          :active-path="activePath"
          :opened-paths="openedPaths"
          :on-toggle="onToggle"
          :on-open="onOpen"
        />
        <p v-else class="px-6 py-1 text-meta text-muted">Empty folder</p>
      </template>
    </li>
  </ul>
</template>
