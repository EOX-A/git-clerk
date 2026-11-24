<script setup>
import { computed, defineAsyncComponent } from "vue";
import { formValue, formText } from "@/helpers/file-editor.js";
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
        </template>
        <template #preview>
          <FilePreview
            v-if="doc.preview"
            :key="doc.preview"
            :url="doc.preview"
            :path="path"
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
