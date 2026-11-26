<script setup>
import { computed, defineAsyncComponent } from "vue";
import { formValue, formText } from "@/helpers/file-editor.js";
import FileIcon from "../file-browser/FileIcon.vue";
import FileSource from "./FileSource.vue";
import FilePreview from "./FilePreview.vue";
import FileSplit from "./FileSplit.vue";
import FileDiff from "./FileDiff.vue";
const FileForm = defineAsyncComponent(() => import("./FileForm.vue"));
const props = defineProps({
  path: { type: String, required: true },
  doc: { type: Object, default: null },
  session: { type: Object, default: null },
  readOnly: Boolean,
  changed: { type: Object, default: null },
  modes: { type: Array, required: true },
  onSelectMode: { type: Function, default: null },
  onClosePane: { type: Function, default: null },
  onChange: { type: Function, required: true },
  onRetry: { type: Function, required: true },
  onHistory: { type: Function, required: true },
});
const dirty = computed(
  () => props.doc?.loaded && props.doc.text !== props.doc.savedText,
);
const readOnly = computed(
  () =>
    props.readOnly ||
    !props.session?.canEdit ||
    props.changed?.status === "removed",
);
const previewValue = computed(() => {
  try {
    return props.doc.meta && !props.doc.meta.generic
      ? formValue(props.doc.text, props.doc.meta)
      : { file: props.doc.text };
  } catch {
    return null;
  }
});
const previewChangeMethod = (value) => {
  if (readOnly.value || props.doc.saving) return;
  if (props.doc.meta && !props.doc.meta.generic)
    props.onChange(formText(value, props.doc.meta, props.doc.text));
  else if (typeof value?.file === "string") props.onChange(value.file);
};
const tabKeyMethod = (event) => {
  const { modes, doc } = props;
  const index = modes.indexOf(doc.mode);
  const next = {
    ArrowRight: (index + 1) % modes.length,
    ArrowLeft: (index + modes.length - 1) % modes.length,
    Home: 0,
    End: modes.length - 1,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  props.onSelectMode(modes[next]);
  event.currentTarget.querySelectorAll('[role="tab"]')[next].focus();
};
</script>
<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <FileDiff v-if="doc?.diff" :session="session" :path="path" />
    <div
      v-else-if="!doc || doc.loading"
      role="status"
      aria-label="Loading file"
      class="space-y-5 p-6 motion-safe:animate-pulse"
    >
      <div
        v-for="n in 8"
        :key="n"
        class="h-3 rounded bg-hover"
        :class="n % 2 ? 'w-3/5' : 'w-4/5'"
      />
    </div>
    <div v-else-if="doc.error" role="alert" class="p-6 text-ui text-closed">
      {{ doc.error }}
      <button type="button" class="underline" @click="onRetry">Retry</button>
    </div>
    <p v-else-if="doc.unavailable" class="p-6 text-ui text-muted">
      {{ doc.unavailable }}
    </p>
    <template v-else>
      <p
        v-if="doc.refreshError"
        role="alert"
        class="px-4 py-2 text-ui text-warn"
      >
        {{ doc.refreshError }}
        <button type="button" class="underline" @click="onRetry">Retry</button>
      </p>
      <p
        v-if="doc.remoteChanged"
        role="status"
        class="border-b border-border-soft px-4 py-2 text-meta text-warn"
      >
        The branch changed in the repository. Your local draft has been
        preserved.
      </p>
      <p
        v-if="doc.schemaError"
        role="alert"
        class="px-4 py-2 text-ui text-warn"
      >
        {{ doc.schemaError }}
        <button type="button" class="underline" @click="onRetry">Retry</button>
      </p>
      <p
        v-if="changed?.status === 'removed'"
        class="border-b border-border-soft px-4 py-2 text-meta text-muted"
      >
        This file was deleted in this session. Showing its base version.
      </p>
      <FileSplit :side="doc.mode !== 'none'" :preview="Boolean(doc.preview)">
        <template #side>
          <section
            id="file-edit-pane"
            aria-label="File editing pane"
            tabindex="-1"
            class="flex min-h-0 flex-1 flex-col bg-bg"
          >
            <div
              class="flex h-10 shrink-0 items-center justify-between border-b border-border bg-ws-nav px-2"
            >
              <div
                v-if="modes.length > 1 && onSelectMode"
                role="tablist"
                aria-label="Editing mode"
                class="-mb-px flex self-stretch pt-1"
                @keydown="tabKeyMethod"
              >
                <button
                  v-for="mode in modes"
                  :id="`file-mode-${mode}`"
                  :key="mode"
                  type="button"
                  role="tab"
                  :aria-selected="doc.mode === mode"
                  aria-controls="file-mode-content"
                  :tabindex="doc.mode === mode ? 0 : -1"
                  class="rounded-t-md border border-transparent px-3.5 text-xs font-medium text-muted hover:text-text focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary aria-selected:border-border aria-selected:border-b-bg aria-selected:bg-bg aria-selected:text-text"
                  @click="onSelectMode(mode)"
                >
                  {{ mode === "editor" ? "Editor" : "Source" }}
                </button>
              </div>
              <span v-else class="px-2 text-xs font-medium">Source</span>
              <button
                type="button"
                v-if="doc.preview && onClosePane"
                :aria-label="`Close ${doc.mode} pane and show preview`"
                title="Close pane and show preview"
                class="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
                @click="onClosePane()"
              >
                <FileIcon name="close" />
              </button>
            </div>
            <div
              id="file-mode-content"
              :role="modes.length > 1 && onSelectMode ? 'tabpanel' : undefined"
              :aria-labelledby="
                modes.length > 1 && onSelectMode
                  ? `file-mode-${doc.mode}`
                  : undefined
              "
              class="flex min-h-0 flex-1 flex-col"
            >
              <FileForm
                v-if="doc.mode === 'editor' && doc.meta?.schema"
                :text="doc.text"
                :meta="doc.meta"
                :interfaces="doc.interfaces"
                :read-only="readOnly || doc.saving"
                :on-change="onChange"
              />
              <FileSource
                v-else
                :path="path"
                :text="doc.text"
                :read-only="readOnly || doc.saving"
                :on-change="onChange"
              />
            </div>
          </section>
        </template>
        <template #preview>
          <FilePreview
            v-if="doc.preview"
            :key="doc.preview"
            :url="doc.preview"
            :path="path"
            :session="session"
            :value="previewValue"
            :dirty="dirty"
            :read-only="readOnly || doc.saving"
            :undo="doc.historyIndex > 0"
            :redo="doc.historyIndex < doc.history.length - 1"
            :on-change="previewChangeMethod"
            :on-undo="() => onHistory(-1)"
            :on-redo="() => onHistory(1)"
          />
        </template>
      </FileSplit>
    </template>
  </div>
</template>
