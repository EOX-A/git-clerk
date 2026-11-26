<script setup>
import { watch } from "vue";
import useOptionsMenu from "@/helpers/use-options-menu.js";
import SessionIcon from "../session/SessionIcon.vue";
import { SESSION_STATUS, sessionTag } from "@/helpers/session-status.js";
import FileIcon from "../file-browser/FileIcon.vue";
import { fileDirectory, fileName } from "@/helpers/file-workspace.js";
const props = defineProps({
  path: { type: String, required: true },
  doc: { type: Object, default: null },
  session: { type: Object, default: null },
  temporary: Boolean,
  dirty: Boolean,
  changed: { type: Object, default: null },
  readOnly: Boolean,
  onTogglePane: { type: Function, default: null },
  onSave: { type: Function, default: null },
  onDiff: { type: Function, default: null },
  onHistory: { type: Function, default: null },
  repositoryUrl: { type: String, default: null },
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
watch([() => props.path, () => props.temporary], () => closeMethod(false));
</script>
<template>
  <div
    class="flex min-h-11 shrink-0 flex-wrap items-center gap-2.5 border-b border-border-soft px-3 py-1.5 pl-3.5"
  >
    <div
      class="flex min-w-0 max-w-full flex-[1_0_240px] flex-wrap items-center gap-x-2 gap-y-1"
    >
      <div
        v-if="path"
        :title="path"
        class="flex min-w-0 max-w-full overflow-hidden font-mono text-xs whitespace-nowrap"
      >
        <span class="truncate text-muted">{{ fileDirectory(path) }}</span
        ><span class="shrink-0 font-medium">{{ fileName(path) }}</span>
      </div>
      <span
        v-else
        class="file-placeholder h-3 w-40 rounded"
        aria-label="File path pending"
      />
      <span
        v-if="readOnly"
        class="inline-flex h-[18px] shrink-0 items-center rounded-full bg-del-bg px-1.5 text-[10.5px]/none font-medium whitespace-nowrap text-del-fg"
        >Read-only ·
        {{
          changed?.status === "removed"
            ? "Deleted file"
            : ["merged", "closed"].includes(session.status)
              ? SESSION_STATUS[sessionTag(session)].label
              : "No write access"
        }}</span
      >
    </div>
    <template v-if="temporary || (doc?.loaded && !doc.unavailable)">
      <button
        v-if="temporary || (!doc.diff && doc.preview)"
        type="button"
        :disabled="temporary"
        :aria-expanded="!temporary && doc.mode !== 'none'"
        aria-controls="file-edit-pane"
        class="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg border border-border-soft px-2.5 text-xs font-medium hover:bg-hover aria-expanded:bg-hover disabled:cursor-default disabled:opacity-60"
        @click="onTogglePane"
      >
        <FileIcon v-if="!readOnly" name="edit" class="size-3.5" />
        {{ readOnly ? "Inspect File" : "Edit File" }}
      </button>
      <div
        v-if="!readOnly && !doc.diff"
        class="flex flex-wrap items-center gap-2.5"
      >
        <div
          v-if="temporary || doc.history.length > 1"
          class="flex items-center gap-1"
        >
          <button
            type="button"
            aria-label="Undo edit"
            title="Undo edit (Ctrl/⌘ + Z)"
            aria-keyshortcuts="Control+Z Meta+Z"
            :disabled="temporary || !doc.historyIndex || doc.saving"
            class="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover disabled:opacity-30"
            @click="onHistory(-1)"
          >
            <FileIcon name="undo" />
          </button>
          <button
            type="button"
            aria-label="Redo edit"
            title="Redo edit (Ctrl/⌘ + Shift + Z or Ctrl + Y)"
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            :disabled="
              temporary ||
              doc.historyIndex >= doc.history.length - 1 ||
              doc.saving
            "
            class="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover disabled:opacity-30"
            @click="onHistory(1)"
          >
            <FileIcon name="redo" />
          </button>
        </div>
        <button
          type="button"
          :disabled="temporary || !dirty || doc.saving"
          :title="
            !dirty && doc.saved && session
              ? `Saved to PR #${session.number}`
              : 'Save changes (Ctrl/⌘ + S)'
          "
          class="h-[30px] rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-on-primary disabled:bg-hover disabled:text-muted"
          @click="onSave"
        >
          <span aria-live="polite">{{
            doc.saving
              ? "Saving…"
              : !dirty && doc.saved
                ? "Saved"
                : "Save changes"
          }}</span>
        </button>
      </div>
    </template>
    <span v-if="doc?.diff && changed" class="flex gap-2 font-mono text-xs"
      ><span class="text-add-fg">+{{ changed.additions }}</span
      ><span class="text-del-fg">−{{ changed.deletions }}</span></span
    >
    <div
      v-if="temporary || changed || repositoryUrl"
      ref="area"
      class="relative ml-auto shrink-0"
      @focusout="blurMethod"
    >
      <button
        ref="trigger"
        type="button"
        aria-label="More file actions"
        title="More file actions"
        :disabled="temporary"
        aria-haspopup="menu"
        :aria-expanded="open"
        aria-controls="file-actions-menu"
        class="flex size-[30px] items-center justify-center rounded-lg border border-border-soft text-muted hover:bg-hover hover:text-text aria-expanded:bg-hover disabled:opacity-60"
        @click="toggleMethod"
        @keydown.down.prevent="toggleMethod"
      >
        <SessionIcon name="dots" />
      </button>
      <div
        v-if="open && !temporary"
        id="file-actions-menu"
        ref="panel"
        role="menu"
        aria-label="File actions"
        class="absolute top-full right-0 z-40 mt-1.5 w-max max-w-[calc(100vw-1rem)] rounded-xl border border-border-soft bg-elev p-1.5 shadow-menu"
        @keydown="keyMethod"
      >
        <button
          v-if="changed"
          type="button"
          role="menuitem"
          class="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-ui hover:bg-hover"
          @click="
            closeMethod();
            onDiff();
          "
        >
          <FileIcon name="file-diff" />
          {{ doc?.diff ? "Back to file" : "View changes" }}
        </button>
        <a
          v-if="repositoryUrl"
          :href="repositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          class="flex min-h-9 items-center gap-2 rounded-lg px-2 text-ui hover:bg-hover"
          @click="closeMethod()"
        >
          <SessionIcon name="external" class="size-4" />View file in repository
        </a>
      </div>
    </div>
  </div>
</template>
