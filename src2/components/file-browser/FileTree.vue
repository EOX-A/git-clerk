<script setup>
import { FILE_STATUS } from "@/helpers/file-workspace.js";
import FileIcon from "./FileIcon.vue";
import FileTreeName from "./FileTreeName.vue";
import FileTreePlaceholder from "./FileTreePlaceholder.vue";

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
  folder: { type: String, default: "" },
  editor: { type: Object, default: null },
  onMenu: { type: Function, default: null },
});

const menuKeyMethod = (event, entry, onMenu) => {
  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
    onMenu?.(event, entry);
};
</script>

<template>
  <ul>
    <li v-if="editor?.action === 'create' && editor.entry.path === folder">
      <FileTreeName :key="editor.id" :editor="editor" :depth="depth" />
    </li>
    <li v-for="entry in entries" :key="entry.path">
      <FileTreeName
        v-if="editor?.action === 'rename' && editor.entry.path === entry.path"
        :key="editor.id"
        :editor="editor"
        :depth="depth"
      />
      <button
        v-else
        type="button"
        :title="
          entry.type === 'submodule' ? `${entry.path} (submodule)` : entry.path
        "
        :aria-expanded="
          entry.type === 'folder' ? Boolean(expanded[entry.path]) : undefined
        "
        :aria-current="activePath === entry.path ? 'true' : undefined"
        :aria-haspopup="
          onMenu && ['folder', 'file'].includes(entry.type) ? 'menu' : undefined
        "
        :disabled="entry.type === 'submodule'"
        class="flex h-7 w-full items-center gap-[5px] rounded-md pr-2 text-left text-[12.5px] hover:bg-ws-hover disabled:cursor-default disabled:opacity-60"
        :class="activePath === entry.path ? 'bg-tint' : ''"
        :style="{ paddingLeft: `${8 + depth * 14}px` }"
        @click="entry.type === 'folder' ? onToggle(entry) : onOpen(entry.path)"
        @contextmenu="onMenu?.($event, entry)"
        @keydown="menuKeyMethod($event, entry, onMenu)"
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
        <FileTree
          v-if="
            directories[entry.path]?.entries?.length ||
            (editor?.action === 'create' && editor.entry.path === entry.path)
          "
          :entries="directories[entry.path]?.entries || []"
          :directories="directories"
          :expanded="expanded"
          :changes="changes"
          :depth="depth + 1"
          :active-path="activePath"
          :opened-paths="openedPaths"
          :on-toggle="onToggle"
          :on-open="onOpen"
          :folder="entry.path"
          :editor="editor"
          :on-menu="onMenu"
        />
        <FileTreePlaceholder
          v-if="directories[entry.path]?.loading"
          :depth="depth + 1"
          compact
          :label="`Loading folder ${entry.path}`"
        />
        <button
          v-else-if="directories[entry.path]?.error"
          type="button"
          class="px-6 py-2 text-meta text-closed"
          @click="onToggle(entry, true)"
        >
          Could not load folder. Retry
        </button>
        <p
          v-else-if="
            !directories[entry.path]?.entries?.length &&
            !(editor?.action === 'create' && editor.entry.path === entry.path)
          "
          class="px-6 py-1 text-meta text-muted"
        >
          Empty folder
        </p>
      </template>
    </li>
  </ul>
</template>
