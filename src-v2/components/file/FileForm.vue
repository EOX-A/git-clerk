<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import "@eox/jsonform";
import "@eox/map";
import "@eox/drawtools";
import { formValue, formText } from "@/helpers/file-editor.js";
const props = defineProps({
  text: { type: String, required: true },
  meta: { type: Object, required: true },
  interfaces: { type: Array, default: () => [] },
  readOnly: Boolean,
  onChange: { type: Function, required: true },
});
const form = ref(null);
const interacted = ref(false);
const parsed = computed(() => {
  try {
    return { value: formValue(props.text, props.meta) };
  } catch {
    return { error: true };
  }
});
const readyMethod = () => {
  if (props.readOnly) form.value?.editor?.disable();
};
const changeMethod = (event) => {
  if (!interacted.value || props.readOnly) return;
  props.onChange(formText(event.detail, props.meta, props.text));
};
watch(
  () => props.readOnly,
  (value) => {
    if (value) form.value?.editor?.disable();
    else form.value?.editor?.enable();
  },
);
onUnmounted(() => form.value?.editor?.destroy());
</script>
<template>
  <div
    class="nav-scrollbar min-h-0 flex-1 overflow-auto p-6 pb-10"
    @pointerdown.capture="interacted = true"
    @keydown.capture="interacted = true"
  >
    <p class="mb-5 text-xs text-muted">
      {{ meta.schema.title || "File schema" }} · fields marked * are required
    </p>
    <p
      v-if="parsed.error"
      role="alert"
      class="rounded-lg bg-del-bg p-3 text-ui text-del-fg"
    >
      This file isn't valid JSON. Fix it in Source to use the form.
    </p>
    <eox-jsonform
      v-else
      ref="form"
      :schema.prop="meta.schema"
      :value.prop="parsed.value"
      :options.prop="meta.jsonform?.options || {}"
      :propertiesToggle.prop="meta.jsonform?.propertiesToggle"
      :customEditorInterfaces.prop="interfaces"
      class="block max-w-[640px] text-text"
      @ready="readyMethod"
      @change="changeMethod"
    />
  </div>
</template>
