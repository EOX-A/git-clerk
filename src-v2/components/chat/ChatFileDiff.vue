<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from "vue";
import { structuredPatch } from "diff";
import { getFileContent } from "@/api/index.js";

const props = defineProps({
  path: { type: String, required: true },
  beforeSha: String,
  text: String,
});
const lines = shallowRef([]);
const status = ref("Loading changes…");
const retryable = ref(false);
const visibleLines = ref(200);
const controller = new AbortController();

async function load() {
  retryable.value = false;
  status.value = "Loading changes…";
  if (!props.beforeSha || typeof props.text !== "string") {
    status.value = "The saved revision is unavailable for this message.";
    return;
  }
  let before;
  try {
    const file = await getFileContent(
      { headSha: props.beforeSha },
      props.path,
      controller.signal,
    );
    before = file.text;
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error.status !== 404) {
      status.value = "Could not load the previous version.";
      retryable.value = true;
      return;
    }
    // A missing path at this revision means the turn created the file.
    if (!props.text) {
      status.value = "Added an empty file.";
      return;
    }
    before = "";
  }
  if (before === null || props.text.length > 1024 * 1024) {
    status.value = "A text comparison is unavailable for this file.";
    return;
  }
  const patch = structuredPatch(
    props.path,
    props.path,
    before,
    props.text,
    undefined,
    undefined,
    { context: 3, timeout: 150 },
  );
  if (!patch) {
    status.value = "This file is too large to compare inline.";
    return;
  }
  lines.value = patch.hunks.flatMap((hunk) => [
    `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    ...hunk.lines,
  ]);
  status.value = lines.value.length ? "" : "No text changes in this turn.";
}
onMounted(load);
onUnmounted(() => controller.abort());
</script>

<template>
  <section class="border-t border-border-soft">
    <h4 class="bg-surface px-3 py-2 font-mono text-xs font-medium break-all">
      {{ path }}
    </h4>
    <p v-if="status" role="status" class="px-3 py-2 text-meta text-muted">
      {{ status }}
      <button
        v-if="retryable"
        type="button"
        class="text-primary underline"
        @click="load"
      >
        Retry
      </button>
    </p>
    <div v-else class="nav-scrollbar overflow-x-auto overscroll-y-auto bg-bg">
      <div class="w-max min-w-full font-mono text-xs leading-5">
        <div
          v-for="(line, index) in lines.slice(0, visibleLines)"
          :key="index"
          class="px-2 whitespace-pre"
          :class="{
            'bg-add-bg text-add-fg': line.startsWith('+'),
            'bg-del-bg text-del-fg': line.startsWith('-'),
            'bg-hunk-bg text-muted': line.startsWith('@@'),
          }"
        >
          {{ line }}
        </div>
      </div>
      <button
        v-if="visibleLines < lines.length"
        type="button"
        class="px-3 py-2 text-meta text-primary hover:underline"
        @click="visibleLines += 200"
      >
        Show more lines
      </button>
    </div>
  </section>
</template>
