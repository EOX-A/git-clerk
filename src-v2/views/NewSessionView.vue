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
const narrativeOutput =
  chatConfig.preset.output_format === "markdown" &&
  /\.md$/i.test(chatConfig.preset.outputFile || "")
    ? chatConfig.preset.outputFile
    : null;
const composer = ref(null);
const manualForm = ref(null);
const route = useRoute();
const router = useRouter();
const aiHeading = ref(null);
const choicesHeading = ref(null);
const options = [
  {
    id: "manual",
    label: "Create a session",
    icon: "file-plus",
    description: "Open a draft to add or edit files yourself.",
    enabled: chatConfig.features.manualSessionCreation,
  },
  {
    id: "ai",
    label: "Use Git Clerk AI",
    icon: "model",
    description: narrativeOutput
      ? "Describe your story and let Git Clerk draft it with you."
      : "Describe your changes and let Git Clerk draft the files.",
    enabled: chatConfig.enabled,
  },
].filter((option) => option.enabled);

const entry = computed(
  () => options.find((option) => option.id === route.query.start)?.id,
);
watch(
  entry,
  (next) => {
    if (next === "ai") aiHeading.value?.focus();
    else if (!next) choicesHeading.value?.focus();
  },
  { flush: "post" },
);
const selectMethod = (id) =>
  router.push({
    path: route.path,
    query: { ...route.query, start: id },
    state: { fromSessionChoices: true },
  });
const backMethod = () => {
  if (router.options.history.state.fromSessionChoices) router.back();
  else {
    const query = { ...route.query };
    delete query.start;
    router.replace({ path: route.path, query });
  }
};
</script>

<template>
  <section
    aria-label="New session"
    class="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-6 sm:px-6"
  >
    <div v-if="!entry" class="m-auto w-full max-w-[680px]">
      <h1
        ref="choicesHeading"
        tabindex="-1"
        class="mb-6 text-heading font-semibold text-balance outline-none"
      >
        How would you like to start?
      </h1>
      <div
        class="grid gap-3"
        :class="{ 'sm:grid-cols-2': options.length === 2 }"
      >
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          :aria-labelledby="`entry-${option.id}`"
          :aria-describedby="`description-${option.id}`"
          class="group flex flex-col items-start rounded-2xl border border-border bg-elev p-5 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
          @click="selectMethod(option.id)"
        >
          <span class="mb-4 flex w-full items-center justify-between">
            <span
              class="grid size-10 place-items-center rounded-xl"
              :class="
                option.id === 'ai'
                  ? 'bg-tint text-primary'
                  : 'bg-hover text-text'
              "
            >
              <ChatIcon :name="option.icon" class="size-5" />
            </span>
            <ChatIcon
              name="chev-right"
              class="size-4 text-muted group-hover:text-primary"
            />
          </span>
          <span :id="`entry-${option.id}`" class="text-base font-semibold">{{
            option.label
          }}</span>
          <span
            :id="`description-${option.id}`"
            class="mt-1 text-sm leading-relaxed text-muted"
            >{{ option.description }}</span
          >
        </button>
      </div>
      <p v-if="!options.length" class="text-ui text-muted">
        {{ ui.disabledMessage }}
      </p>
      <ChatProgress v-if="error" class="mt-3" :error="error" />
    </div>
    <div v-show="entry" class="m-auto w-full max-w-[640px] space-y-5">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded text-ui text-muted hover:text-text"
        :disabled="manualForm?.busy"
        @click="backMethod"
      >
        <ChatIcon name="chev-right" class="size-3.5 rotate-180" /> Back to
        options
      </button>
      <CreateSessionForm v-if="entry === 'manual'" ref="manualForm" />
      <div v-if="chatConfig.enabled" v-show="entry === 'ai'" class="space-y-5">
        <header>
          <h1
            ref="aiHeading"
            tabindex="-1"
            class="text-heading font-semibold text-balance outline-none"
          >
            {{ ui.heading }}
          </h1>
          <p v-if="ui.description" class="mt-2 text-sm text-muted">
            {{ ui.description }}
          </p>
        </header>
        <ChatComposer
          ref="composer"
          :busy="connecting"
          :active="entry === 'ai'"
          :on-send="onSend"
        />
        <div v-if="ui.suggestions.length" class="flex flex-wrap gap-2">
          <button
            v-for="suggestion in ui.suggestions"
            :key="suggestion"
            type="button"
            :disabled="connecting"
            class="rounded-lg border border-border-soft px-3 py-1.5 text-ui text-primary hover:bg-hover"
            @click="composer?.setMessage(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
        <p class="text-meta text-muted">{{ ui.footer }}</p>
        <ChatProgress v-if="error" :error="error" />
      </div>
    </div>
  </section>
</template>
