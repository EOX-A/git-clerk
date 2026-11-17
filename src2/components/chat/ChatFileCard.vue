<script setup>
import { computed, ref } from "vue";
import ChatIcon from "./ChatIcon.vue";
import { splitFilePath } from "@/helpers/chat-dummy.js";

const props = defineProps({
  files: { type: Array, default: () => [] },
  stage: { type: String, default: "saved" },
  onOpenFile: { type: Function, default: null },
  onOpenChanges: { type: Function, default: null },
});
const expanded = ref(new Set());
const label = computed(
  () =>
    ({
      generating: "Generating files",
      generated: "Generated files",
      publishing: "Publishing files",
      failed: "Files not saved",
      stopped: "Generation stopped",
      saved: "Saved files",
    })[props.stage] || "Generated files",
);
const fileStatus = (file) =>
  props.stage === "saved"
    ? file.status || "Saved"
    : props.stage === "publishing"
      ? "Publishing"
      : file.content === undefined
        ? "Incomplete"
        : "Generated";
const preview = (file) =>
  (typeof file.content === "string"
    ? file.content
    : JSON.stringify(file.content, null, 2)
  ).slice(0, 50000);
const toggleMethod = (path, open) => {
  const next = new Set(expanded.value);
  if (open) next.add(path);
  else next.delete(path);
  expanded.value = next;
};
</script>

<template>
  <section
    aria-label="Generated file changes"
    class="mt-3 min-w-0 overflow-hidden rounded-xl border border-border-soft bg-elev"
  >
    <div
      class="flex items-center gap-2 border-b border-border-soft bg-surface/60 px-3 py-2.5"
    >
      <ChatIcon
        :name="stage === 'saved' ? 'check-circle' : 'files'"
        class="size-4 text-primary"
      />
      <span class="flex-1 text-ui font-medium">{{ label }}</span>
      <span
        class="rounded bg-hover px-1.5 py-0.5 text-meta tabular-nums text-muted"
        >{{ files.length }}</span
      >
    </div>
    <div class="nav-scrollbar max-h-[360px] overflow-y-auto overscroll-contain">
      <details
        v-for="file in files"
        :key="file.path"
        class="group border-b border-border-soft last:border-0"
        @toggle="toggleMethod(file.path, $event.target.open)"
      >
        <summary
          class="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
        >
          <ChatIcon
            name="chev-right"
            class="size-3.5 text-muted transition-transform group-open:rotate-90"
          />
          <span class="min-w-0 flex-1" :title="file.path">
            <span class="block truncate font-mono text-[12px] font-medium">{{
              splitFilePath(file.path).name
            }}</span>
            <span class="block truncate font-mono text-[10.5px] text-muted">{{
              splitFilePath(file.path).dir
            }}</span>
          </span>
          <span
            class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            :class="
              stage === 'saved'
                ? 'bg-add-bg text-add-fg'
                : 'bg-surface text-muted'
            "
          >
            {{
              stage === "generating" && file.content === undefined
                ? "Generating"
                : fileStatus(file)
            }}
          </span>
        </summary>
        <div
          v-if="expanded.has(file.path)"
          class="border-t border-border-soft bg-bg"
        >
          <pre
            v-if="file.content !== undefined"
            tabindex="0"
            :aria-label="`JSON preview of ${file.path}`"
            class="nav-scrollbar max-h-64 overflow-auto p-3 font-mono text-[11px] leading-5 text-text"
          ><code>{{ preview(file) }}</code></pre>
          <p v-else class="p-3 text-meta text-muted">
            {{
              stage === "generating"
                ? "Receiving file content…"
                : "No JSON preview available."
            }}
          </p>
          <p
            v-if="file.content !== undefined && preview(file).length === 50000"
            class="px-3 pb-2 text-meta text-muted"
          >
            Preview limited to 50,000 characters.
          </p>
          <button
            v-if="stage === 'saved' && onOpenFile"
            type="button"
            class="m-2 rounded-md px-2 py-1 text-ui font-medium text-primary hover:bg-hover"
            @click="onOpenFile(file.path)"
          >
            Open file
          </button>
        </div>
      </details>
    </div>
    <button
      v-if="stage === 'saved' && onOpenChanges"
      type="button"
      class="flex w-full items-center justify-center gap-1.5 border-t border-border-soft px-3 py-2 text-ui font-medium text-primary hover:bg-hover"
      @click="onOpenChanges()"
    >
      <ChatIcon name="diff" class="size-4" /> View changes
    </button>
  </section>
</template>
