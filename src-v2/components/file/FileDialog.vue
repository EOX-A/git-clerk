<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
const props = defineProps({
  paths: { type: Array, default: () => [] },
  errors: { type: Array, default: () => [] },
  sessionNumber: { type: Number, required: true },
  busy: Boolean,
  canSave: Boolean,
  onCancel: { type: Function, required: true },
  onDiscard: { type: Function, default: () => {} },
  onSave: { type: Function, default: () => {} },
});
const dialog = ref(null),
  primary = ref(null);
let previousFocus;
onMounted(async () => {
  previousFocus = document.activeElement;
  dialog.value.showModal();
  await nextTick();
  primary.value?.focus();
});
onUnmounted(() => {
  if (previousFocus?.isConnected) previousFocus.focus();
});
</script>
<template>
  <dialog
    ref="dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="file-dialog-title"
    aria-describedby="file-dialog-description"
    :aria-busy="busy"
    class="m-auto max-h-[80dvh] w-[460px] max-w-[calc(100vw-32px)] overflow-auto rounded-2xl border border-border-soft bg-elev p-6 text-text shadow-floating backdrop:bg-scrim"
    @cancel.prevent="!busy && onCancel()"
  >
    <h2 id="file-dialog-title" class="text-base font-semibold">
      {{
        errors.length
          ? "Fix validation errors"
          : paths.length === 1
            ? `Save changes to ${paths[0].split("/").pop()}?`
            : "Save your changes?"
      }}
    </h2>
    <p id="file-dialog-description" class="mt-3 text-ui text-muted">
      {{
        errors.length
          ? "Review these errors before saving."
          : `Your edits haven't been saved to session #${sessionNumber}. If you discard them, they're gone.`
      }}
    </p>
    <ul v-if="errors.length" class="mt-4 space-y-2 text-ui text-closed">
      <li v-for="(error, index) in errors" :key="index">
        {{ error.path ? `${error.path}: ` : "" }}{{ error.message }}
      </li>
    </ul>
    <ul v-else-if="paths.length > 1" class="mt-4 space-y-1 font-mono text-xs">
      <li v-for="path in paths" :key="path" class="break-all">{{ path }}</li>
    </ul>
    <div class="mt-6 flex justify-end gap-2">
      <button
        v-if="!errors.length"
        type="button"
        :disabled="busy"
        class="rounded-lg px-3 py-2 text-ui hover:bg-hover disabled:opacity-40"
        @click="onCancel"
      >
        Cancel
      </button>
      <button
        v-if="!errors.length"
        type="button"
        :disabled="busy"
        class="rounded-lg px-3 py-2 text-ui text-closed hover:bg-del-bg disabled:opacity-40"
        @click="onDiscard"
      >
        Discard
      </button>
      <button
        ref="primary"
        type="button"
        :disabled="busy || (!errors.length && !canSave)"
        class="rounded-lg bg-primary px-3 py-2 text-ui font-semibold text-on-primary disabled:opacity-40"
        @click="errors.length ? onCancel() : onSave()"
      >
        {{ errors.length ? "Back to file" : busy ? "Saving…" : "Save" }}
      </button>
    </div>
  </dialog>
</template>
