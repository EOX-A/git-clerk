<script setup>
import { ref } from "vue";

const props = defineProps({
  width: { type: Number, required: true },
  updateWidth: { type: Function, required: true },
  minWidth: { type: Number, default: 240 },
  maxWidth: { type: Number, default: 360 },
  defaultWidth: { type: Number, default: 280 },
});

const resizing = ref(false);
let startX = 0;
let startWidth = 0;
let pointerID = null;

const resizeMethod = (width) => {
  props.updateWidth(
    Math.round(Math.min(props.maxWidth, Math.max(props.minWidth, width))),
  );
};

const startResizeMethod = (event) => {
  if (event.button !== 0 || pointerID !== null) return;
  event.preventDefault();
  startX = event.clientX;
  startWidth = props.width;
  pointerID = event.pointerId;
  event.currentTarget.setPointerCapture(pointerID);
  resizing.value = true;
};

const moveResizeMethod = (event) => {
  if (event.pointerId !== pointerID) return;
  resizeMethod(startWidth + event.clientX - startX);
};

const stopResizeMethod = (event) => {
  if (event.pointerId !== pointerID) return;
  if (event.currentTarget.hasPointerCapture(pointerID)) {
    event.currentTarget.releasePointerCapture(pointerID);
  }
  pointerID = null;
  resizing.value = false;
};

const resizeKeyMethod = (event) => {
  const widths = {
    ArrowLeft: props.width - 8,
    ArrowRight: props.width + 8,
    Home: props.minWidth,
    End: props.maxWidth,
    Enter: props.defaultWidth,
  };
  if (widths[event.key] === undefined) return;
  event.preventDefault();
  resizeMethod(widths[event.key]);
};
</script>

<template>
  <div
    role="separator"
    tabindex="0"
    aria-label="Sidebar width"
    aria-orientation="vertical"
    aria-controls="global-navigation"
    :aria-valuemin="minWidth"
    :aria-valuemax="maxWidth"
    :aria-valuenow="width"
    :aria-valuetext="`${width} pixels`"
    title="Drag to resize. Double-click or press Enter to reset."
    :data-resizing="resizing"
    :class="resizing ? 'bg-tint' : 'bg-transparent'"
    class="sidebar-resizer absolute inset-y-0 -right-[3px] z-10 w-[7px] touch-none cursor-col-resize select-none hover:bg-tint focus-visible:bg-tint"
    @pointerdown="startResizeMethod"
    @pointermove="moveResizeMethod"
    @pointerup="stopResizeMethod"
    @pointercancel="stopResizeMethod"
    @lostpointercapture="stopResizeMethod"
    @keydown="resizeKeyMethod"
    @dblclick="resizeMethod(defaultWidth)"
  >
    <span
      class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-soft"
    ></span>
  </div>
</template>

<style scoped>
/* Prevent text selection while the captured pointer moves across the workspace. */
:global(body:has(.sidebar-resizer[data-resizing="true"])) {
  cursor: col-resize;
  user-select: none;
}
</style>
