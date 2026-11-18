<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import FileIcon from "./FileIcon.vue";

const props = defineProps({
  entry: { type: Object, required: true },
  anchor: { type: Object, required: true },
  onAction: { type: Function, required: true },
  onClose: { type: Function, required: true },
});
const menu = ref(null);
const position = ref({ visibility: "hidden" });
const actions =
  props.entry.type === "folder"
    ? [{ id: "create", label: "New file", icon: "file-plus" }]
    : [
        { id: "rename", label: "Rename", icon: "edit" },
        { id: "delete", label: "Delete", icon: "trash" },
      ];

const outsideMethod = (event) => {
  if (!menu.value?.contains(event.target)) props.onClose(false);
};
const blurMethod = (event) => {
  if (event.relatedTarget && !menu.value.contains(event.relatedTarget))
    props.onClose(false);
};
const resizeMethod = () => props.onClose(false);
const keyMethod = (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    props.onClose();
    return;
  }
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const items = [...menu.value.querySelectorAll("button")];
  const current = items.indexOf(document.activeElement);
  const offset = event.key === "ArrowUp" ? -1 : 1;
  const index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (current + offset + items.length) % items.length;
  items[index]?.focus();
};
onMounted(async () => {
  const { width, height } = menu.value.getBoundingClientRect();
  position.value = {
    left: `${Math.max(8, Math.min(props.anchor.x, window.innerWidth - width - 8))}px`,
    top: `${Math.max(8, Math.min(props.anchor.y, window.innerHeight - height - 8))}px`,
  };
  await nextTick();
  if (!menu.value) return;
  menu.value.querySelector("button")?.focus({ preventScroll: true });
  document.addEventListener("pointerdown", outsideMethod);
  window.addEventListener("resize", resizeMethod);
  window.addEventListener("scroll", resizeMethod, true);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", outsideMethod);
  window.removeEventListener("resize", resizeMethod);
  window.removeEventListener("scroll", resizeMethod, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="menu"
      role="menu"
      :aria-label="
        entry.name ? `Actions for ${entry.name}` : 'File tree actions'
      "
      :style="position"
      class="fixed z-[70] w-40 max-w-[calc(100vw-16px)] rounded-lg border border-border-soft bg-elev p-1 text-ui text-text shadow-menu"
      @keydown="keyMethod"
      @focusout="blurMethod"
    >
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        role="menuitem"
        :class="action.id === 'delete' ? 'text-closed' : ''"
        class="flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-hover focus:bg-hover"
        @click="onAction(action.id)"
      >
        <FileIcon :name="action.icon" class="size-3.5" />
        {{ action.label }}
      </button>
    </div>
  </Teleport>
</template>
