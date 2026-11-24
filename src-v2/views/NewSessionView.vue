<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CreateSessionForm } from "@/components/session";
import { ChatComposer, ChatIcon, ChatProgress } from "@/components/chat";
import { getChatConfig } from "@/helpers/chat-config.js";

defineProps({
  connecting: Boolean,
  error: { type: String, default: "" },
  onSend: { type: Function, required: true },
});
const chatConfig = getChatConfig();
const ui = chatConfig.preset.ui;
const manualEnabled = chatConfig.features.manualSessionCreation;
const narrativeOutput =
  chatConfig.preset.output_format === "markdown" &&
  /\.md$/i.test(chatConfig.preset.outputFile || "")
    ? chatConfig.preset.outputFile
    : null;
const composer = ref(null);
const manualForm = ref(null);
const nameDialog = ref(null);
const manualTrigger = ref(null);
const route = useRoute();
const router = useRouter();
const showNameForm = computed(
  () =>
    manualEnabled &&
    !narrativeOutput &&
    (!chatConfig.enabled || route.query.start === "manual"),
);
watch(
  showNameForm,
  (show) => {
    if (!show) manualTrigger.value?.focus();
  },
  { flush: "post" },
);
const backMethod = async () => {
  if (router.options.history.state.fromSessionChoices) router.back();
  else {
    const query = { ...route.query };
    delete query.start;
    await router.replace({ path: route.path, query });
  }
};
</script>

<template>
  <section
    aria-label="New session"
    class="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6"
  >
    <div v-if="showNameForm" class="m-auto w-full max-w-[640px] space-y-5">
      <button
        v-if="chatConfig.enabled"
        type="button"
        class="inline-flex items-center gap-1 rounded text-ui text-muted hover:text-text"
        :disabled="manualForm?.busy"
        @click="backMethod"
      >
        <ChatIcon name="chev-right" class="size-3.5 rotate-180" /> Back to start
      </button>
      <CreateSessionForm ref="manualForm" />
    </div>
    <div v-show="!showNameForm" class="m-auto w-full max-w-[640px]">
      <template v-if="chatConfig.enabled">
        <header class="mb-5">
          <h1 class="text-heading font-semibold text-balance">
            {{ ui.heading }}
          </h1>
          <p v-if="ui.description" class="mt-2 text-sm text-muted">
            {{ ui.description }}
          </p>
        </header>
        <ChatComposer
          ref="composer"
          starter
          :placeholder="ui.placeholder"
          :busy="connecting || manualForm?.busy"
          :active="!showNameForm"
          :on-send="onSend"
        />
        <div v-if="ui.suggestions.length" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="suggestion in ui.suggestions"
            :key="suggestion"
            type="button"
            :disabled="connecting || manualForm?.busy"
            class="rounded-lg border border-border-soft px-3 py-1.5 text-ui text-primary hover:bg-hover"
            @click="composer?.setMessage(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
        <p
          v-if="!narrativeOutput && ui.footer"
          class="mt-2 text-meta text-muted"
        >
          {{ ui.footer }}
        </p>
      </template>
      <template v-if="manualEnabled && !showNameForm">
        <div
          v-if="chatConfig.enabled"
          class="my-6 flex items-center gap-4 text-xs text-muted"
        >
          <span class="h-px flex-1 bg-border" />or<span
            class="h-px flex-1 bg-border"
          />
        </div>
        <button
          ref="manualTrigger"
          type="button"
          :aria-haspopup="narrativeOutput ? 'dialog' : undefined"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-elev px-4 py-2.5 text-ui font-semibold hover:bg-hover"
          @click="
            narrativeOutput
              ? nameDialog.showModal()
              : router.push({
                  path: route.path,
                  query: { ...route.query, start: 'manual' },
                  state: { fromSessionChoices: true },
                })
          "
        >
          {{
            narrativeOutput
              ? "Start with a blank narrative"
              : "Start with a blank session"
          }}
          <ChatIcon name="chev-right" class="size-4" />
        </button>
        <dialog
          v-if="narrativeOutput"
          ref="nameDialog"
          aria-modal="true"
          aria-labelledby="create-session-title"
          aria-describedby="create-session-description"
          :aria-busy="manualForm?.busy"
          class="m-auto max-h-[90dvh] w-[480px] max-w-[calc(100vw-32px)] overflow-auto rounded-2xl border border-border-soft bg-elev p-6 text-text shadow-floating backdrop:bg-scrim"
          @cancel="manualForm?.busy && $event.preventDefault()"
          @close="manualTrigger?.focus()"
        >
          <CreateSessionForm
            ref="manualForm"
            :blank-output="narrativeOutput"
            @cancel="nameDialog.close()"
          />
        </dialog>
        <p
          v-if="chatConfig.enabled && narrativeOutput"
          class="mt-2 text-ui text-muted"
        >
          Name your session, then start writing. You can ask AI for help as you
          write.
        </p>
      </template>
      <p
        v-if="!manualEnabled && !chatConfig.enabled"
        class="text-ui text-muted"
      >
        {{ ui.disabledMessage }}
      </p>
      <ChatProgress v-if="error" class="mt-3" :error="error" />
    </div>
  </section>
</template>
