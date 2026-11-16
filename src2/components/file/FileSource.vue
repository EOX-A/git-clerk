<script setup>
import { computed, nextTick, ref } from "vue";
import { sourceTokens } from "@/helpers/file-editor.js";
const props = defineProps({
  path: { type: String, required: true },
  text: { type: String, required: true },
  readOnly: Boolean,
  onChange: { type: Function, required: true },
});
const source = ref(null);
const scrollTop = ref(0),
  scrollLeft = ref(0);
const lines = computed(() => props.text.split("\n").length);
const tokens = computed(() => sourceTokens(props.text, props.path));
const scrollMethod = (event) => {
  scrollTop.value = event.target.scrollTop;
  scrollLeft.value = event.target.scrollLeft;
};
const indentMethod = async (event) => {
  if (props.readOnly || event.shiftKey) return;
  event.preventDefault();
  const input = source.value;
  const start = input.selectionStart,
    end = input.selectionEnd;
  props.onChange(props.text.slice(0, start) + "  " + props.text.slice(end));
  await nextTick();
  input.setSelectionRange(start + 2, start + 2);
};
</script>
<template>
  <div
    class="source-pane relative flex min-h-0 flex-1 overflow-hidden bg-bg font-mono text-[12.5px]/5"
  >
    <div
      aria-hidden="true"
      class="w-12 shrink-0 overflow-hidden border-r border-border-soft bg-bg text-right text-muted"
    >
      <div
        class="px-2.5 py-3"
        :style="{ transform: `translateY(-${scrollTop}px)` }"
      >
        <div v-for="line in lines" :key="line">{{ line }}</div>
      </div>
    </div>
    <div class="relative min-w-0 flex-1 overflow-hidden">
      <pre
        aria-hidden="true"
        class="pointer-events-none absolute top-0 left-0 m-0 min-h-full min-w-full px-4 py-3 font-[inherit] leading-[inherit] whitespace-pre"
        :style="{ transform: `translate(-${scrollLeft}px, -${scrollTop}px)` }"
      ><span v-for="(token, index) in tokens" :key="index" :class="token.color">{{ token.text }}</span></pre>
      <textarea
        ref="source"
        :value="text"
        :aria-label="`Source for ${path}`"
        :readonly="readOnly"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        wrap="off"
        class="nav-scrollbar source-input absolute inset-0 h-full w-full resize-none border-0 bg-transparent px-4 py-3 font-[inherit] leading-[inherit] text-transparent caret-text outline-none"
        @input="onChange($event.target.value)"
        @scroll="scrollMethod"
        @keydown.tab="indentMethod"
      />
    </div>
  </div>
</template>
<style scoped>
.source-input {
  tab-size: 2;
}
.source-input::selection {
  background: var(--tint);
  color: var(--text);
}
@media (forced-colors: active) {
  .source-input {
    color: CanvasText;
  }
  pre {
    visibility: hidden;
  }
}
</style>
