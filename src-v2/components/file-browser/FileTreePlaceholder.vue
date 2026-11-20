<script setup>
import FileIcon from "./FileIcon.vue";

defineProps({
  depth: { type: Number, default: 0 },
  compact: Boolean,
  label: { type: String, default: "Loading branch files" },
});
const rows = [
  { depth: 0, folder: true, expanded: true, width: "45%" },
  { depth: 1, folder: true, expanded: true, width: "38%" },
  { depth: 2, width: "54%" },
  { depth: 2, width: "40%" },
  { depth: 1, width: "58%" },
  { depth: 0, folder: true, width: "48%" },
  { depth: 0, folder: true, expanded: true, width: "36%" },
  { depth: 1, width: "55%" },
  { depth: 1, width: "43%" },
  { depth: 0, width: "62%" },
];
</script>

<template>
  <div role="status" :aria-label="label">
    <div
      v-for="(row, index) in compact ? rows.slice(0, 4) : rows"
      :key="index"
      aria-hidden="true"
      class="flex h-7 items-center gap-[5px] overflow-hidden pr-2 text-border"
      :style="{ paddingLeft: `${8 + (depth + row.depth) * 14}px` }"
    >
      <FileIcon
        v-if="row.folder"
        name="chevron"
        class="size-[13px]"
        :class="row.expanded ? 'rotate-90' : ''"
      />
      <span v-else class="w-[13px] shrink-0" />
      <FileIcon :name="row.folder ? 'folder' : 'file'" class="size-[15px]" />
      <span
        class="file-placeholder h-2.5 min-w-3 rounded"
        :style="{ width: row.width }"
      />
    </div>
  </div>
</template>
