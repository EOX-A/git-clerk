<script setup>
import { onMounted, ref } from "vue";

defineProps({
  path: { type: String, required: true },
  busy: Boolean,
  error: { type: String, default: "" },
  onCancel: { type: Function, required: true },
  onDelete: { type: Function, required: true },
});
const dialog = ref(null);
onMounted(() => dialog.value.showModal());
</script>

<template>
  <dialog
    ref="dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="file-tree-delete-title"
    aria-describedby="file-tree-delete-description"
    :aria-busy="busy"
    class="m-auto w-[420px] max-w-[calc(100vw-32px)] rounded-2xl border border-border-soft bg-elev p-6 text-text shadow-floating backdrop:bg-scrim"
    @cancel.prevent="!busy && onCancel()"
    @keydown.esc.stop
  >
    <h2 id="file-tree-delete-title" class="text-base font-semibold">
      Delete file?
    </h2>
    <p id="file-tree-delete-description" class="mt-3 text-ui text-muted">
      <strong class="break-all text-text">{{ path }}</strong> will be removed
      from this session branch.
    </p>
    <p v-if="error" role="alert" class="mt-3 text-ui text-closed">
      {{ error }}
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button
        type="button"
        autofocus
        :disabled="busy"
        class="rounded-lg px-3 py-2 text-ui hover:bg-hover disabled:opacity-40"
        @click="onCancel"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="busy"
        class="rounded-lg bg-del-bg px-3 py-2 text-ui font-semibold text-del-fg hover:brightness-95 disabled:opacity-40"
        @click="onDelete"
      >
        {{ busy ? "Deleting…" : "Delete file" }}
      </button>
    </div>
  </dialog>
</template>
