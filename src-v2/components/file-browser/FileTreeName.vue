<script setup>
import { onMounted, ref } from "vue";
import FileIcon from "./FileIcon.vue";

const props = defineProps({
  editor: { type: Object, required: true },
  depth: { type: Number, required: true },
});
const input = ref(null);
const name = ref(
  props.editor.action === "rename" ? props.editor.entry.name : "",
);

onMounted(() => {
  input.value.focus();
  if (props.editor.action === "rename") {
    const extension = name.value.lastIndexOf(".");
    input.value.setSelectionRange(
      0,
      extension > 0 ? extension : name.value.length,
    );
  }
});
</script>

<template>
  <form
    class="py-0.5 pr-2"
    :style="{ paddingLeft: `${8 + depth * 14}px` }"
    :aria-busy="editor.busy"
    @submit.prevent="!editor.busy && editor.onSubmit(name)"
    @keydown.esc.stop.prevent="!editor.busy && editor.onCancel()"
  >
    <div class="flex min-w-0 items-center gap-[5px]">
      <span class="w-[13px] shrink-0" />
      <FileIcon name="file" class="size-[15px] text-muted" />
      <input
        ref="input"
        v-model="name"
        type="text"
        :aria-label="
          editor.action === 'create' ? 'New file name' : 'Rename file'
        "
        :aria-invalid="Boolean(editor.error)"
        :aria-describedby="editor.error ? 'file-tree-name-error' : undefined"
        :readonly="editor.busy"
        :placeholder="editor.action === 'create' ? 'New file name' : undefined"
        autocomplete="off"
        spellcheck="false"
        class="h-6 min-w-0 flex-1 rounded border border-primary bg-elev px-1.5 text-[12.5px] text-text outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    <p
      v-if="editor.error"
      id="file-tree-name-error"
      role="alert"
      class="mt-1 ml-[33px] break-words text-meta text-closed"
    >
      {{ editor.error }}
    </p>
    <p
      v-else-if="editor.busy"
      role="status"
      class="mt-1 ml-[33px] text-meta text-muted"
    >
      Saving…
    </p>
  </form>
</template>
