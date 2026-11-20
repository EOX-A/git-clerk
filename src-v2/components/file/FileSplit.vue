<script setup>
import { onMounted, onUnmounted, ref } from "vue";
defineProps({ side: Boolean, preview: Boolean });
const panel = ref(null),
  fraction = ref(40),
  narrow = ref(false),
  dragging = ref(false);
let observer;
const resizeMethod = (event) => {
  if (!dragging.value) return;
  const rect = panel.value.getBoundingClientRect();
  fraction.value = Math.max(
    25,
    Math.min(75, ((event.clientX - rect.left) / rect.width) * 100),
  );
};
const startMethod = (event) => {
  dragging.value = true;
  event.currentTarget.setPointerCapture(event.pointerId);
  resizeMethod(event);
};
const keyMethod = (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  fraction.value =
    event.key === "Home"
      ? 25
      : event.key === "End"
        ? 75
        : Math.max(
            25,
            Math.min(
              75,
              fraction.value + (event.key === "ArrowRight" ? 5 : -5),
            ),
          );
};
onMounted(() => {
  observer = new ResizeObserver(
    ([entry]) => (narrow.value = entry.contentRect.width < 620),
  );
  observer.observe(panel.value);
});
onUnmounted(() => observer?.disconnect());
</script>
<template>
  <div
    ref="panel"
    class="relative flex min-h-0 flex-1"
    :class="dragging ? 'select-none [&_iframe]:pointer-events-none' : ''"
  >
    <div
      v-if="side"
      class="flex min-h-0 min-w-0 flex-col"
      :class="!preview || narrow ? 'flex-1' : 'shrink-0'"
      :style="preview && !narrow ? { width: `${fraction}%` } : {}"
    >
      <slot name="side" />
    </div>
    <div
      v-if="side && preview && !narrow"
      role="separator"
      tabindex="0"
      aria-label="Resize preview"
      aria-orientation="vertical"
      :aria-valuenow="Math.round(fraction)"
      :aria-valuemin="25"
      :aria-valuemax="75"
      class="group relative z-10 -mx-[3px] flex w-[7px] shrink-0 touch-none cursor-col-resize justify-center hover:bg-tint focus-visible:bg-tint"
      :class="dragging ? 'bg-tint' : ''"
      @pointerdown.prevent="startMethod"
      @pointermove="resizeMethod"
      @pointerup="dragging = false"
      @pointercancel="dragging = false"
      @lostpointercapture="dragging = false"
      @keydown="keyMethod"
    >
      <div class="h-full w-px bg-border-soft group-hover:bg-primary" />
    </div>
    <div
      v-show="preview && (!side || !narrow)"
      class="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <slot name="preview" />
    </div>
  </div>
</template>
