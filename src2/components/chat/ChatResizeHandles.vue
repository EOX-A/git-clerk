<script setup>
defineProps({ onResize: { type: Function, required: true } });
const handles = [
  {
    direction: "l",
    classes: "top-3.5 bottom-3.5 left-0 w-1.5 cursor-ew-resize",
  },
  {
    direction: "r",
    classes: "top-3.5 bottom-3.5 right-0 w-1.5 cursor-ew-resize",
  },
  {
    direction: "t",
    classes: "top-0 left-3.5 right-3.5 h-1.5 cursor-ns-resize",
  },
  {
    direction: "b",
    classes: "bottom-0 left-3.5 right-3.5 h-1.5 cursor-ns-resize",
  },
  { direction: "tl", classes: "top-0 left-0 size-5 cursor-nwse-resize" },
  { direction: "tr", classes: "top-0 right-0 size-5 cursor-nesw-resize" },
  { direction: "bl", classes: "bottom-0 left-0 size-5 cursor-nesw-resize" },
  { direction: "br", classes: "bottom-0 right-0 size-5 cursor-nwse-resize" },
];
</script>
<template>
  <div
    v-for="handle in handles"
    :key="handle.direction"
    aria-hidden="true"
    :class="handle.classes"
    class="absolute z-20 touch-none"
    @pointerdown.stop="onResize(handle.direction, $event)"
  >
    <svg
      v-if="handle.direction === 'br'"
      viewBox="0 0 20 20"
      class="size-5 text-muted"
      fill="none"
      stroke="currentColor"
    >
      <path d="m9 16 7-7m-3 7 3-3" />
    </svg>
  </div>
</template>
