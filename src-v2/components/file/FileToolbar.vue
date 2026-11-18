<script setup>
import { fileDirectory, fileName } from "@/helpers/file-workspace.js";
defineProps({
  path: { type: String, required: true },
  doc: { type: Object, default: null },
  session: { type: Object, required: true },
  dirty: Boolean,
  changed: { type: Object, default: null },
  readOnly: Boolean,
  onMode: { type: Function, required: true },
  onSave: { type: Function, required: true },
  onDiff: { type: Function, required: true },
  onHistory: { type: Function, required: true },
  repositoryUrl: { type: String, default: null },
});
</script>
<template>
  <div
    class="flex min-h-11 shrink-0 flex-wrap items-center gap-2.5 border-b border-border-soft px-3 py-1.5 pl-3.5"
  >
    <div
      class="flex min-w-0 max-w-full flex-[1_0_240px] flex-wrap items-center gap-x-2 gap-y-1"
    >
      <div
        :title="path"
        class="flex min-w-0 max-w-full overflow-hidden font-mono text-xs whitespace-nowrap"
      >
        <span class="truncate text-muted">{{ fileDirectory(path) }}</span
        ><span class="shrink-0 font-medium">{{ fileName(path) }}</span>
      </div>
      <span
        v-if="readOnly"
        class="inline-flex h-[18px] shrink-0 items-center rounded-full bg-del-bg px-1.5 text-[10.5px]/none font-medium whitespace-nowrap text-del-fg"
        >Read-only ·
        {{
          changed?.status === "removed"
            ? "Deleted file"
            : session.status === "merged"
              ? "Merged"
              : session.status === "closed"
                ? "Closed"
                : "No write access"
        }}</span
      >
    </div>
    <template v-if="doc?.loaded && !doc.unavailable">
      <div
        v-if="!doc.diff && (doc.preview || doc.meta?.schema)"
        role="group"
        aria-label="File view"
        class="flex shrink-0 gap-0.5 rounded-lg bg-hover p-0.5"
      >
        <button
          v-if="doc.meta?.schema && !doc.meta.generic"
          type="button"
          :aria-pressed="doc.mode === 'editor'"
          class="h-[26px] rounded-md px-[9px] text-xs font-medium"
          :class="
            doc.mode === 'editor'
              ? 'bg-elev shadow-selected'
              : 'text-muted hover:text-text'
          "
          @click="onMode('editor')"
        >
          Editor
        </button>
        <button
          type="button"
          :aria-pressed="doc.mode === 'source'"
          class="h-[26px] rounded-md px-[9px] text-xs font-medium"
          :class="
            doc.mode === 'source'
              ? 'bg-elev shadow-selected'
              : 'text-muted hover:text-text'
          "
          @click="onMode('source')"
        >
          Source
        </button>
      </div>
      <div
        v-if="!readOnly && !doc.diff"
        class="flex flex-wrap items-center gap-2.5"
        :class="
          doc.preview || doc.meta?.schema ? 'border-l border-border pl-2.5' : ''
        "
      >
        <div v-if="doc.history.length > 1" class="flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo edit"
            title="Undo edit"
            :disabled="!doc.historyIndex || doc.saving"
            class="size-7 rounded-md text-muted hover:bg-hover disabled:opacity-30"
            @click="onHistory(-1)"
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="Redo edit"
            title="Redo edit"
            :disabled="doc.historyIndex >= doc.history.length - 1 || doc.saving"
            class="size-7 rounded-md text-muted hover:bg-hover disabled:opacity-30"
            @click="onHistory(1)"
          >
            ↷
          </button>
        </div>
        <span
          role="status"
          class="text-xs empty:absolute"
          :class="dirty ? 'text-muted' : 'text-open'"
          >{{
            dirty
              ? "Unsaved changes"
              : doc.saved
                ? `✓ Saved to PR #${session.number}`
                : ""
          }}</span
        >
        <button
          type="button"
          :disabled="!dirty || doc.saving"
          title="Save changes (Ctrl/⌘ + S)"
          class="h-[30px] rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-on-primary disabled:bg-hover disabled:text-muted"
          @click="onSave"
        >
          {{ doc.saving ? "Saving…" : "Save changes" }}
        </button>
      </div>
    </template>
    <span v-if="doc?.diff && changed" class="flex gap-2 font-mono text-xs"
      ><span class="text-add-fg">+{{ changed.additions }}</span
      ><span class="text-del-fg">−{{ changed.deletions }}</span></span
    >
    <button
      v-if="changed"
      type="button"
      :aria-pressed="Boolean(doc?.diff)"
      class="h-[30px] rounded-lg border border-border-soft px-2 text-xs hover:bg-hover"
      @click="onDiff"
    >
      {{ doc?.diff ? "Back to file" : "View changes" }}
    </button>
    <a
      v-if="repositoryUrl"
      :href="repositoryUrl"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View file in repository"
      title="View file in repository"
      class="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border-soft hover:bg-hover"
      ><svg viewBox="0 0 16 16" aria-hidden="true" class="size-4 fill-current">
        <path
          d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656"
        ></path></svg
    ></a>
  </div>
</template>
