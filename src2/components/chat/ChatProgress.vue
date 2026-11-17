<script setup>
import { computed } from "vue";
import ChatIcon from "./ChatIcon.vue";
import { getChatConfig } from "@/helpers/chat-config.js";
const props = defineProps({
  busy: Boolean,
  phase: { type: String, default: "idle" },
  progress: { type: String, default: "" },
  error: { type: String, default: "" },
  canRetry: Boolean,
  canStop: Boolean,
  onRetry: { type: Function, default: null },
  onStop: { type: Function, default: null },
});
const steps = getChatConfig().publishing.enabled
  ? ["Generate", "Prepare", "Publish"]
  : ["Generate"];
const step = computed(() =>
  ["generating", "preparing", "saving"].indexOf(props.phase),
);
</script>
<template>
  <div v-if="busy || error" class="flex flex-col gap-2 text-ui">
    <ol
      v-if="busy && step >= 0"
      aria-label="Response progress"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta"
    >
      <li
        v-for="(label, index) in steps"
        :key="label"
        :aria-current="index === step ? 'step' : undefined"
        class="flex items-center gap-1"
        :class="index <= step ? 'text-primary' : 'text-muted'"
      >
        <ChatIcon v-if="index < step" name="check" class="size-3" />
        <span
          v-else
          class="flex size-4 items-center justify-center rounded-full border border-current text-[9px]"
          >{{ index + 1 }}</span
        >
        {{ label }}
      </li>
    </ol>
    <p v-if="busy" role="status" class="flex items-center gap-2 text-muted">
      <span
        aria-hidden="true"
        class="size-3 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none"
      />
      {{ progress || "Connecting…" }}
      <button
        v-if="canStop"
        type="button"
        class="ml-auto rounded px-2 py-1 text-primary hover:bg-hover"
        @click="onStop?.()"
      >
        Stop
      </button>
    </p>
    <p v-if="error" role="alert" class="text-del-fg">{{ error }}</p>
    <button
      v-if="canRetry && !busy"
      type="button"
      class="self-start rounded-lg px-3 py-1.5 text-primary hover:bg-hover"
      @click="onRetry?.()"
    >
      {{ error ? "Retry saving draft" : "Publish changes" }}
    </button>
  </div>
</template>
