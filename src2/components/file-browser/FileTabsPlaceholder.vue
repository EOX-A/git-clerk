<script setup>
import FileIcon from "./FileIcon.vue";

defineProps({ count: { type: Number, default: 3 } });
</script>

<template>
  <div
    role="status"
    aria-label="Loading changed files"
    class="flex min-w-0 flex-1"
  >
    <div
      v-for="n in Math.min(Math.max(count, 1), 5)"
      :key="n"
      aria-hidden="true"
      class="flex min-w-10 basis-[200px] items-center gap-[7px] overflow-hidden border-r border-border-soft px-3"
      :class="n === 1 ? 'bg-elev' : ''"
    >
      <FileIcon class="size-3.5 text-border" />
      <span
        class="file-placeholder h-2.5 min-w-0 rounded"
        :class="n % 2 ? 'w-24' : 'w-20'"
      />
    </div>
  </div>
</template>
