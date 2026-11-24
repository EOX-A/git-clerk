<script setup>
import { ref } from "vue";
import { CreateSessionDialog } from "@/components/session";
import { ChatComposer, ChatProgress } from "@/components/chat";
import { getChatConfig } from "@/helpers/chat-config.js";

defineProps({
  connecting: Boolean,
  error: { type: String, default: "" },
  onSend: { type: Function, required: true },
});
const chatConfig = getChatConfig();
const ui = chatConfig.preset.ui;
const composer = ref(null);
const createSessionOpen = ref(false);
</script>

<template>
  <section
    aria-label="New session"
    class="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6"
  >
    <div class="m-auto flex w-full max-w-[680px] flex-col gap-3">
      <h1
        id="new-session-heading"
        class="mb-4 text-center text-heading font-semibold text-balance"
      >
        {{ ui.heading }}
      </h1>
      <p v-if="ui.description" class="text-center text-sm text-muted">
        {{ ui.description }}
      </p>
      <div
        v-if="chatConfig.enabled && ui.suggestions.length"
        class="flex flex-wrap justify-center gap-2"
      >
        <button
          v-for="suggestion in ui.suggestions"
          :key="suggestion"
          type="button"
          :disabled="connecting"
          class="rounded-lg border border-border-soft px-3 py-2 text-ui text-primary hover:bg-hover"
          @click="composer?.setMessage(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
      <div class="shrink-0 space-y-3">
        <ChatProgress :error="error" />
        <ChatComposer
          v-if="chatConfig.enabled"
          ref="composer"
          :busy="connecting"
          :on-send="onSend"
        />
        <p v-else class="text-center text-ui text-muted">
          {{ ui.disabledMessage }}
        </p>
        <p class="text-center text-meta text-muted">
          {{ ui.footer }}
        </p>
        <p
          v-if="chatConfig.features.manualSessionCreation"
          class="text-center text-ui text-muted"
        >
          Want to manually create session without AI?
          <button
            type="button"
            class="rounded-sm font-medium text-primary underline-offset-4 hover:underline"
            @click="createSessionOpen = true"
          >
            Create Session
          </button>
        </p>
      </div>
    </div>
    <CreateSessionDialog
      v-if="createSessionOpen"
      :on-close="() => (createSessionOpen = false)"
    />
  </section>
</template>
