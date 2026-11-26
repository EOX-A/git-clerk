<script setup>
import { ref } from "vue";
import { Markdown } from "vue-stream-markdown";
import ChatActivity from "./ChatActivity.vue";
import {
  chatMarkdownParser,
  chatMarkdownSecurity,
} from "@/helpers/chat-markdown.js";
import "vue-stream-markdown/index.css";

defineProps({
  text: { type: String, default: "" },
  streaming: Boolean,
  revealing: Boolean,
  activity: { type: String, default: "" },
});
const container = ref(null);
</script>

<template>
  <div
    ref="container"
    class="chat-markdown min-w-0 text-sm leading-[22px] text-text"
  >
    <Markdown
      :content="text"
      :mode="streaming || revealing ? 'streaming' : 'static'"
      :parser-options="chatMarkdownParser"
      :harden-options="chatMarkdownSecurity"
      :theme-element="() => container"
      :style="{ '--muted': 'var(--surface)' }"
      :enable-animate="false"
      :enable-caret="false"
      :previewers="false"
      :controls="{
        code: { copy: true, download: false, fullscreen: false },
        table: false,
        image: false,
      }"
      :code-options="{
        languageIcon: false,
        lineNumbers: false,
        maxHeight: 280,
      }"
      :link-options="{ favicon: false }"
      locale="en-US"
    />
    <span
      v-if="streaming"
      role="status"
      class="mt-2 inline-flex min-h-6 items-center gap-2 text-meta text-muted"
    >
      <ChatActivity />
      {{
        activity || (text ? "Generating response" : "Working on your request…")
      }}
    </span>
  </div>
</template>

<style scoped>
/* Map the renderer's scoped tokens to Git Clerk's explicit light/dark palette. */
.chat-markdown {
  --background: var(--elev);
  --foreground: var(--text);
  --card: var(--elev);
  --card-foreground: var(--text);
  --popover: var(--elev);
  --popover-foreground: var(--text);
  --muted-foreground: var(--muted);
  --secondary: var(--surface);
  --secondary-foreground: var(--text);
  --accent: var(--hover);
  --accent-foreground: var(--text);
  --primary-foreground: var(--on-primary);
}
.chat-markdown :deep(.stream-markdown) {
  font-size: inherit;
  line-height: inherit;
  min-width: 0;
}
.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3) {
  font-size: 1em;
  line-height: 1.5;
  margin-top: 1em;
}
.chat-markdown :deep(pre) {
  font-size: 12px;
}
.chat-markdown :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.chat-markdown :deep(table) {
  font-size: 12px;
}
</style>
