<script setup>
import { computed } from "vue";
import useOptionsMenu from "@/helpers/use-options-menu.js";
import SessionIcon from "./SessionIcon.vue";

const props = defineProps({
  session: { type: Object, default: null },
  disabled: Boolean,
  onAction: { type: Function, required: true },
  compact: { type: Boolean, default: false },
  label: { type: String, default: "Session options" },
});
const {
  open,
  area,
  trigger,
  panel,
  closeMethod,
  toggleMethod,
  blurMethod,
  keyMethod,
} = useOptionsMenu();
const menuId = computed(
  () => `session-options-${props.session?.number ?? "pending"}`,
);
const actionMethod = (action) => {
  closeMethod();
  props.onAction(action);
};
</script>

<template>
  <div ref="area" class="relative shrink-0" @focusout="blurMethod">
    <button
      ref="trigger"
      type="button"
      :disabled="disabled"
      :aria-label="label"
      :title="compact ? 'More options' : label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="menuId"
      :class="[
        compact
          ? [
              'size-[26px] rounded-[6px] hover:bg-border-soft',
              open
                ? 'bg-border-soft opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto group-focus-within/row:opacity-100 group-focus-within/row:pointer-events-auto group-data-[selected=true]/row:opacity-100 group-data-[selected=true]/row:pointer-events-auto',
            ]
          : 'size-11 rounded-lg border border-border-soft hover:bg-hover aria-expanded:bg-hover disabled:opacity-60 workspace:size-[30px]',
      ]"
      class="flex items-center justify-center text-muted hover:text-text focus-visible:opacity-100 focus-visible:pointer-events-auto"
      @click.stop="toggleMethod"
      @keydown.down.prevent="toggleMethod"
    >
      <SessionIcon
        :name="compact ? 'dots-h' : 'dots'"
        :class="compact ? 'size-4' : ''"
      />
    </button>
    <div
      v-if="open && session"
      :id="menuId"
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
        ><SessionIcon name="external" class="size-[15px]" />View session</a
      >
      <div role="separator" class="my-1 border-t border-border-soft"></div>
      <button
        type="button"
        role="menuitem"
        :disabled="!session.canDelete"
        :title="
          session.canDelete
            ? 'Close the session and delete its branch'
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
