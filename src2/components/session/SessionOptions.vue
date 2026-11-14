<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import SessionIcon from "./SessionIcon.vue";

const props = defineProps({
  session: { type: Object, required: true },
  onAction: { type: Function, required: true },
});
const open = ref(false);
const area = ref(null);
const trigger = ref(null);
const panel = ref(null);
const closeMethod = (restore = true) => {
  open.value = false;
  if (restore) trigger.value?.focus();
};
const toggleMethod = async () => {
  if (open.value) return closeMethod();
  open.value = true;
  await nextTick();
  panel.value.querySelector('[role="menuitem"]:not(:disabled)')?.focus();
};
const actionMethod = (action) => {
  closeMethod();
  props.onAction(action);
};
const outsideMethod = (event) => {
  if (!area.value.contains(event.target)) closeMethod(false);
};
const blurMethod = (event) => {
  if (event.relatedTarget && !area.value.contains(event.relatedTarget))
    closeMethod(false);
};
const keyMethod = (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeMethod();
  }
  const items = [
    ...panel.value.querySelectorAll('[role="menuitem"]:not(:disabled)'),
  ];
  const current = items.indexOf(document.activeElement);
  const next =
    event.key === "ArrowDown"
      ? (current + 1) % items.length
      : event.key === "ArrowUp"
        ? (current - 1 + items.length) % items.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : null;
  if (next !== null) {
    event.preventDefault();
    items[next]?.focus();
  }
};
onMounted(() => document.addEventListener("pointerdown", outsideMethod));
onUnmounted(() => document.removeEventListener("pointerdown", outsideMethod));
</script>

<template>
  <div ref="area" class="relative shrink-0" @focusout="blurMethod">
    <button
      ref="trigger"
      type="button"
      aria-label="Session options"
      title="Session options"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-controls="session-options"
      :class="open ? 'bg-hover' : ''"
      class="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-text workspace:size-8"
      @click="toggleMethod"
      @keydown.down.prevent="toggleMethod"
    >
      <SessionIcon name="dots" />
    </button>
    <div
      v-if="open"
      id="session-options"
      ref="panel"
      role="menu"
      aria-label="Session options"
      class="absolute top-full right-0 z-40 mt-1.5 w-[188px] rounded-xl border border-border-soft bg-elev p-1.5 shadow-menu"
      @keydown="keyMethod"
    >
      <button
        type="button"
        role="menuitem"
        :disabled="!session.canManage"
        class="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-ui hover:bg-hover disabled:cursor-default disabled:opacity-40"
        @click="actionMethod('rename')"
      >
        <SessionIcon name="edit" class="size-[15px]" />Rename session
      </button>
      <a
        role="menuitem"
        :href="session.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex min-h-9 items-center gap-2 rounded-lg px-2 text-ui hover:bg-hover"
        @click="closeMethod()"
        ><SessionIcon name="external" class="size-[15px]" />Open on GitHub</a
      >
      <div role="separator" class="my-1 border-t border-border-soft"></div>
      <button
        type="button"
        role="menuitem"
        :disabled="!session.canDelete"
        :title="
          session.canDelete
            ? 'Close the PR and delete its branch'
            : 'This session or its branch cannot be deleted by this account'
        "
        class="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-ui text-closed hover:bg-hover disabled:cursor-default disabled:opacity-40"
        @click="actionMethod('delete')"
      >
        <SessionIcon name="trash" class="size-[15px]" />Delete session
      </button>
    </div>
  </div>
</template>
