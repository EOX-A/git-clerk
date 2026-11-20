<script setup>
import {
  FILE_STATUS,
  fileDirectory,
  fileName,
} from "@/helpers/file-workspace.js";
import FileIcon from "./FileIcon.vue";

defineProps({
  files: { type: Array, required: true },
  activePath: { type: String, default: null },
  openedPaths: { type: Array, required: true },
  onOpen: { type: Function, required: true },
});
const statusMethod = (file) => FILE_STATUS[file.status] || FILE_STATUS.changed;
</script>

<template>
  <div class="flex flex-col gap-px">
    <button
      v-for="file in files"
      :key="file.path"
      type="button"
      :title="
        file.previousPath ? `${file.previousPath} → ${file.path}` : file.path
      "
      :aria-label="`${file.path}, ${statusMethod(file).label}${openedPaths.includes(file.path) ? ', open' : ''}`"
      :aria-current="activePath === file.path ? 'true' : undefined"
      class="flex w-full items-start gap-2 rounded-md px-2 py-[7px] text-left hover:bg-ws-hover"
      :class="activePath === file.path ? 'bg-tint' : ''"
      @click="onOpen(file.path)"
    >
      <FileIcon
        :name="statusMethod(file).icon"
        class="mt-0.5 size-[15px]"
        :class="statusMethod(file).color"
      />
      <span class="flex min-w-0 flex-1 flex-col gap-px">
        <span class="truncate text-[12.5px]/[19px]">{{
          fileName(file.path)
        }}</span>
        <span
          v-if="fileDirectory(file.path)"
          class="truncate text-[11px]/4 text-muted"
          >{{ fileDirectory(file.path) }}</span
        >
        <span class="flex gap-2 text-[11px]/4">
          <span class="font-medium" :class="statusMethod(file).color">{{
            statusMethod(file).label
          }}</span>
          <span class="font-mono text-add-fg">+{{ file.additions }}</span>
          <span class="font-mono text-del-fg">−{{ file.deletions }}</span>
        </span>
      </span>
      <span
        v-if="openedPaths.includes(file.path)"
        class="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
        title="Open in tabs"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
