<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { getFileDiff } from "@/api/index.js";
import { parseDiff } from "@/helpers/file-editor.js";
const props = defineProps({
  session: { type: Object, required: true },
  path: { type: String, required: true },
});
const result = ref(null),
  loading = ref(false),
  error = ref("");
let controller,
  requestID = 0;
const rows = computed(() =>
  result.value?.patch ? parseDiff(result.value.patch) : [],
);
const loadMethod = async () => {
  const id = ++requestID;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = "";
  result.value = null;
  try {
    const data = await getFileDiff(
      props.session,
      props.path,
      controller.signal,
    );
    if (id === requestID) result.value = data;
  } catch {
    if (id === requestID) error.value = "Could not load saved changes.";
  } finally {
    if (id === requestID) loading.value = false;
  }
};
watch(
  () => [props.path, props.session.headSha, props.session.updatedAt],
  loadMethod,
  { immediate: true },
);
onUnmounted(() => {
  requestID++;
  controller?.abort();
});
</script>
<template>
  <div class="nav-scrollbar min-h-0 flex-1 overflow-auto bg-bg">
    <p class="border-b border-border-soft px-4 py-2 text-meta text-muted">
      Saved changes in PR #{{ session.number }} · unsaved edits are not included
    </p>
    <p v-if="loading" role="status" class="p-6 text-muted">Loading changes…</p>
    <p v-else-if="error" role="alert" class="p-6 text-closed">
      {{ error }} <button class="underline" @click="loadMethod">Retry</button>
    </p>
    <p v-else-if="result?.patch === null" class="p-6 text-ui text-muted">
      GitHub did not provide a text diff for this file. Open it on GitHub to
      review the changes.
    </p>
    <p v-else-if="!rows.length" class="p-6 text-ui text-muted">
      No saved changes in this file.
    </p>
    <div
      v-else
      class="min-w-max font-mono text-[12.5px]/5"
      aria-label="Saved file diff"
    >
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="flex"
        :class="
          row.type === 'add'
            ? 'bg-add-bg text-add-fg'
            : row.type === 'delete'
              ? 'bg-del-bg text-del-fg'
              : row.type === 'hunk'
                ? 'bg-hunk-bg text-muted'
                : ''
        "
      >
        <span
          aria-hidden="true"
          class="w-12 shrink-0 px-2 text-right text-muted"
          >{{ row.oldLine }}</span
        ><span
          aria-hidden="true"
          class="w-12 shrink-0 border-r border-border-soft px-2 text-right text-muted"
          >{{ row.newLine }}</span
        >
        <span class="px-4 whitespace-pre">{{ row.text }}</span>
      </div>
    </div>
  </div>
</template>
