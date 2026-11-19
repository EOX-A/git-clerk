<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import useChatStore from "@/stores/chat.js";
import useSessionsStore from "@/stores/sessions.js";
import sessionError from "@/helpers/session-error.js";
import useChatAutoscroll from "@/helpers/use-chat-autoscroll.js";
import { CreateSessionDialog } from "@/components/session";
import { ChatComposer, ChatMessageList, ChatProgress } from "@/components/chat";
import { getChatConfig } from "@/helpers/chat-config.js";
const chatConfig = getChatConfig();
const ui = chatConfig.preset.ui;
const composer = ref(null);

const router = useRouter();
const chatStore = useChatStore();
const sessionsStore = useSessionsStore();
const conversation = shallowRef(chatStore.getConversation());
const state = computed(() => conversation.value.state);
const titlePending = computed(
  () =>
    state.value.messages.length > 0 &&
    state.value.busy &&
    !state.value.draftIdentity,
);
const createSessionOpen = ref(false);
const scroller = ref(null);
const pinned = ref(true);
const messageContent = useChatAutoscroll(scroller, pinned);
const connecting = ref(true);
let opening = false;
watch(
  () => chatStore.scopeMethod(),
  () => {
    conversation.value.cancelMethod();
    conversation.value = chatStore.getConversation();
  },
);
const sendMethod = (payload) => conversation.value.sendMethod(payload);
const openMethod = async () => {
  if (!state.value.session || state.value.busy) return;
  opening = true;
  try {
    const failure = await router.push({
      name: "session",
      params: { sessionNumber: state.value.session.number },
    });
    if (failure)
      state.value.error = "The files were saved. Open the session to continue.";
  } catch {
    state.value.error = "The files were saved. Open the session to continue.";
  } finally {
    opening = false;
  }
};
watch(
  () => [state.value.completed, state.value.busy],
  () => {
    if (state.value.completed && !state.value.busy) openMethod();
  },
);
watch(
  () => [
    state.value.messages.length,
    state.value.messages.at(-1)?.text,
    state.value.messages.at(-1)?.files?.length,
  ],
  async () => {
    if (!pinned.value) return;
    await nextTick();
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  },
);
const scrollMethod = () => {
  const element = scroller.value;
  pinned.value =
    element.scrollHeight - element.scrollTop - element.clientHeight < 48;
};
const unloadMethod = (event) => {
  if (state.value.phase === "saving") {
    event.preventDefault();
    event.returnValue = "";
  }
};
onBeforeRouteLeave(() => {
  if (opening) return true;
  return conversation.value.cancelMethod();
});
onMounted(async () => {
  window.addEventListener("beforeunload", unloadMethod);
  try {
    await sessionsStore.ensureConnected();
  } catch (cause) {
    state.value.error = sessionError(cause);
  } finally {
    connecting.value = false;
  }
});
onUnmounted(() => {
  window.removeEventListener("beforeunload", unloadMethod);
  conversation.value.cancelMethod();
});
</script>

<template>
  <section
    aria-labelledby="new-session-heading"
    class="flex h-full min-h-0 flex-col px-4 py-6 sm:px-6"
  >
    <div
      :class="state.messages.length ? 'h-full min-h-0' : 'my-auto'"
      class="mx-auto flex w-full max-w-[680px] flex-col gap-3"
    >
      <h1
        id="new-session-heading"
        aria-live="polite"
        :class="
          state.messages.length
            ? 'text-left text-lg'
            : 'text-center text-heading'
        "
        class="mb-4 font-semibold text-balance"
      >
        <template v-if="titlePending">
          <span
            aria-hidden="true"
            class="file-placeholder my-1 block h-5 w-48 max-w-full rounded-md"
          />
          <span class="sr-only">{{ ui.sessionTitle }}</span>
        </template>
        <template v-else>
          {{
            state.messages.length
              ? state.draftIdentity?.title || ui.sessionTitle
              : ui.heading
          }}
        </template>
      </h1>
      <p
        v-if="!state.messages.length && ui.description"
        class="text-center text-sm text-muted"
      >
        {{ ui.description }}
      </p>
      <div
        v-if="
          chatConfig.enabled && !state.messages.length && ui.suggestions.length
        "
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
      <div
        v-if="state.messages.length"
        ref="scroller"
        role="log"
        aria-label="New session conversation"
        tabindex="0"
        class="nav-scrollbar min-h-0 flex-1 overflow-y-auto py-3"
        @scroll="scrollMethod"
      >
        <div ref="messageContent">
          <ChatMessageList :messages="state.messages" />
        </div>
      </div>
      <div class="shrink-0 space-y-3">
        <ChatProgress
          :busy="state.busy"
          :phase="state.phase"
          :progress="state.progress"
          :error="state.error"
          :can-retry="chatConfig.publishing.enabled && Boolean(state.pending)"
          :can-stop="state.busy && state.phase !== 'saving'"
          :on-retry="conversation.retryMethod"
          :on-stop="conversation.cancelMethod"
        />
        <button
          v-if="state.completed && !state.busy"
          type="button"
          class="rounded px-3 py-2 text-primary hover:bg-hover"
          @click="openMethod"
        >
          View PR #{{ state.session.number }}
        </button>
        <ChatComposer
          v-if="chatConfig.enabled"
          ref="composer"
          :busy="state.busy || connecting"
          :on-send="sendMethod"
        />
        <p v-else class="text-center text-ui text-muted">
          {{ ui.disabledMessage }}
        </p>
        <p class="text-center text-meta text-muted">
          {{ ui.footer }}
        </p>
        <p
          v-if="
            !state.messages.length && chatConfig.features.manualSessionCreation
          "
          class="text-center text-ui text-muted"
        >
          Want to manually create session without AI?
          <button
            type="button"
            :disabled="state.busy"
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
