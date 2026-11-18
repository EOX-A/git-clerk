<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
const props = defineProps({
  url: { type: String, required: true },
  path: { type: String, required: true },
  value: { required: true },
  readOnly: Boolean,
  dirty: Boolean,
  undo: Boolean,
  redo: Boolean,
  onChange: { type: Function, required: true },
  onUndo: { type: Function, required: true },
  onRedo: { type: Function, required: true },
});
const frame = ref(null);
const busy = ref(true);
const origin = computed(() => new URL(props.url).origin);
const sendMethod = () => {
  if (props.value === null) return;
  frame.value?.contentWindow?.postMessage(
    {
      type: "SCHEMA_DATA_EDITOR_UPDATE",
      detail: JSON.parse(JSON.stringify(props.value)),
      undo: !props.readOnly && props.undo,
      redo: !props.readOnly && props.redo,
      readOnly: props.readOnly,
    },
    origin.value,
  );
};
const loadedMethod = () => {
  busy.value = false;
  sendMethod();
};
const messageMethod = (event) => {
  if (
    event.source !== frame.value?.contentWindow ||
    event.origin !== origin.value ||
    !event.data
  )
    return;
  const { type, detail } = event.data;
  if (type === "ENABLE_LOADER_POSTMESSAGE") busy.value = true;
  if (type === "DISABLE_LOADER_POSTMESSAGE") busy.value = false;
  if (props.readOnly) return;
  if (type === "SCHEMA_DATA_PREVIEW_UPDATE" && detail !== undefined)
    props.onChange(detail);
  if (type === "SCHEMA_DATA_EDITOR_UNDO") props.onUndo();
  if (type === "SCHEMA_DATA_EDITOR_REDO") props.onRedo();
};
watch(() => [props.value, props.readOnly, props.undo, props.redo], sendMethod, {
  deep: true,
});
onMounted(() => window.addEventListener("message", messageMethod));
onUnmounted(() => window.removeEventListener("message", messageMethod));
</script>
<template>
  <div
    role="region"
    aria-label="Preview"
    class="relative flex min-h-0 min-w-0 flex-1 flex-col bg-bg"
  >
    <div
      class="flex h-9 shrink-0 items-center gap-2 border-b border-border-soft pr-1.5 pl-3.5"
    >
      <span class="text-xs font-medium">Preview</span>
      <span v-if="dirty" class="text-meta text-muted"
        >· includes unsaved edits</span
      >
    </div>
    <p
      v-if="busy && value !== null"
      role="status"
      class="absolute top-12 left-3 z-10 rounded-lg bg-elev px-3 py-2 text-meta text-muted shadow-selected"
    >
      Loading preview…
    </p>
    <p v-if="value === null" role="alert" class="p-6 text-ui text-closed">
      Fix the invalid JSON in Source to update the preview.
    </p>
    <iframe
      v-else
      ref="frame"
      id="previewFrame"
      :src="url"
      :title="`Preview of ${path}`"
      class="min-h-0 w-full flex-1 border-0 bg-white"
      @load="loadedMethod"
    />
  </div>
</template>
