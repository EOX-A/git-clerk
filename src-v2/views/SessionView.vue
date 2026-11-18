<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";
import sessionError from "@/helpers/session-error.js";
import useChatLayout from "@/helpers/use-chat-layout.js";
import useChatStore from "@/stores/chat.js";
import { SessionTopbar } from "@/components/session";
import { FileWorkspace } from "@/components/file-browser";
import { ChatPanel, ChatResizeHandles } from "@/components/chat";
import { getChatConfig } from "@/helpers/chat-config.js";
const chatConfig = getChatConfig();

const route = useRoute();
const sessionsStore = useSessionsStore();
const session = ref(null);
const error = ref("");
const hasUnsaved = ref(false);
const fileOperationPending = ref(false);

const fileWorkspaceRef = ref(null);
const workspaceContainer = ref(null);

const mobileView = ref("chat");
const {
  mode,
  style,
  bounds,
  narrow,
  dockedWidth,
  containerWidth,
  dragging,
  resetMethod,
  startDragMethod,
  startResizeMethod,
  startDockedResizeMethod,
  dockedKeyMethod,
  toggleDockMethod,
} = useChatLayout(workspaceContainer, mobileView);
const chatStore = useChatStore();
const conversation = computed(() =>
  chatStore.getConversation(Number(route.params.sessionNumber)),
);
const chat = computed(() => conversation.value.state);
const messages = computed(() => chat.value.messages);
const blockedReason = computed(() =>
  fileOperationPending.value
    ? "Wait for the file operation to finish before asking for another change."
    : hasUnsaved.value
      ? "Save or discard your file edits before asking for another change."
      : "",
);
const sendMethod = (payload) => {
  if (blockedReason.value || !session.value?.canEdit) return false;
  return conversation.value.sendMethod(payload, session.value);
};
const retryChatMethod = () => {
  if (!blockedReason.value && session.value?.canEdit)
    conversation.value.retryMethod();
};
watch(
  () => chat.value.completed,
  () => {
    const published = chat.value.publication?.session;
    if (published?.number !== Number(route.params.sessionNumber)) return;
    // Publication already verified these details; discard older in-flight reads.
    requestID++;
    controller?.abort();
    loading = false;
    error.value = "";
    session.value = { ...published };
  },
);
watch(conversation, (_current, previous) => previous?.cancelMethod());
watch(
  () => session.value?.canEdit,
  (editable) => {
    if (editable === false) conversation.value.cancelMethod();
  },
);
onBeforeRouteLeave(() => conversation.value.cancelMethod());
const chatUnloadMethod = (event) => {
  if (chat.value.phase === "saving") {
    event.preventDefault();
    event.returnValue = "";
  }
};
let requestID = 0;
let controller;
let refreshTimer;
let loading = false;

const querySessionDetailsMethod = async (refresh = false) => {
  const currentRequest = ++requestID;
  controller?.abort();
  controller = new AbortController();
  if (!refresh) session.value = null;
  error.value = "";
  loading = true;
  try {
    const data = await sessionsStore.getSession(
      Number(route.params.sessionNumber),
      controller.signal,
    );
    if (currentRequest === requestID) {
      session.value = data;
    }
  } catch (cause) {
    if (currentRequest === requestID) error.value = sessionError(cause);
  } finally {
    if (currentRequest === requestID) loading = false;
  }
};

const refreshSessionMethod = () => querySessionDetailsMethod(true);
const backgroundRefreshMethod = () => {
  if (
    !loading &&
    document.visibilityState === "visible" &&
    session.value &&
    ["draft", "open"].includes(session.value.status)
  )
    refreshSessionMethod();
};

const handleOpenFileMethod = (path) => {
  if (narrow.value) mobileView.value = "files";
  nextTick(() => {
    fileWorkspaceRef.value?.openFile(path);
  });
};

const handleOpenChangesMethod = () => {
  if (narrow.value) mobileView.value = "files";
  nextTick(() => {
    fileWorkspaceRef.value?.openChanges();
  });
};

watch(
  () => route.params.sessionNumber,
  () => {
    resetMethod();
    hasUnsaved.value = false;
    querySessionDetailsMethod();
  },
  { immediate: true },
);
watch(
  () =>
    sessionsStore.sessions.find(
      (item) => item.number === Number(route.params.sessionNumber),
    ),
  (updated) => {
    // Sidebar actions load details too, but list summaries lack commit information.
    if (updated?.hasDetails && session.value?.number === updated.number)
      session.value = updated;
  },
);

onMounted(() => {
  window.addEventListener("beforeunload", chatUnloadMethod);
  window.addEventListener("focus", backgroundRefreshMethod);
  refreshTimer = window.setInterval(backgroundRefreshMethod, 30000);
});

onUnmounted(() => {
  conversation.value.cancelMethod();
  window.removeEventListener("beforeunload", chatUnloadMethod);
  requestID++;
  controller?.abort();
  window.clearInterval(refreshTimer);
  window.removeEventListener("focus", backgroundRefreshMethod);
});
</script>

<template>
  <section
    ref="workspaceContainer"
    class="relative flex h-full min-h-0 flex-col overflow-hidden"
  >
    <SessionTopbar
      :key="route.params.sessionNumber"
      :session="session"
      :failed="Boolean(error) && !session"
      :on-updated="refreshSessionMethod"
      :has-unsaved="hasUnsaved || fileOperationPending"
      :mobile-view="mobileView"
      :show-view-switch="narrow && chatConfig.enabled"
      :on-mobile-view="(view) => (mobileView = view)"
    />
    <div v-if="error" class="shrink-0 px-6 py-3">
      <p role="alert">{{ error }}</p>
      <button
        type="button"
        class="mt-2 rounded-lg px-3 py-2 text-primary hover:bg-hover"
        @click="refreshSessionMethod"
      >
        Retry
      </button>
    </div>
    <!-- Keep both panels mounted across layout changes to retain drafts and tabs. -->
    <div v-if="session" class="relative flex min-h-0 flex-1 overflow-hidden">
      <aside
        v-show="chatConfig.enabled && (!narrow || mobileView === 'chat')"
        aria-label="Session chat"
        :style="style"
        :class="
          mode === 'floating'
            ? 'fixed z-[45] rounded-2xl border border-border-soft shadow-floating'
            : mode === 'docked'
              ? 'relative h-full shrink-0 border-r border-border-soft'
              : 'h-full w-full'
        "
        class="flex min-h-0 min-w-0 flex-col bg-elev"
      >
        <ChatResizeHandles
          v-if="mode === 'floating'"
          :on-resize="startResizeMethod"
        />
        <ChatPanel
          :key="session.number"
          :mode="mode"
          :session="session"
          :messages="messages"
          :busy="chat.busy"
          :phase="chat.phase"
          :progress="chat.progress"
          :blocked-reason="blockedReason"
          :error="chat.error"
          :can-retry="Boolean(chat.pending) && !blockedReason"
          :can-stop="chat.busy && chat.phase !== 'saving'"
          :on-retry="retryChatMethod"
          :on-stop="conversation.cancelMethod"
          :active="!narrow || mobileView === 'chat'"
          :compact="
            mode === 'floating'
              ? bounds.w < 470
              : mode === 'docked'
                ? dockedWidth < 470
                : containerWidth < 470
          "
          :on-dock="() => toggleDockMethod(true)"
          :on-float="() => toggleDockMethod(false)"
          :on-drag-start="startDragMethod"
          :on-open-file="handleOpenFileMethod"
          :on-open-changes="handleOpenChangesMethod"
          :on-send="sendMethod"
        />
      </aside>
      <div
        v-if="chatConfig.enabled && mode === 'docked'"
        role="separator"
        aria-orientation="vertical"
        aria-label="Chat width"
        :aria-valuemin="320"
        :aria-valuemax="Math.max(320, containerWidth - 380)"
        :aria-valuenow="dockedWidth"
        :aria-valuetext="`${dockedWidth} pixels`"
        tabindex="0"
        title="Drag or use arrow keys to resize. Press Enter to reset."
        :class="dragging ? 'bg-tint' : 'bg-transparent'"
        class="relative z-10 -mx-[3px] flex w-[7px] shrink-0 cursor-col-resize touch-none justify-center hover:bg-tint focus-visible:bg-tint"
        @pointerdown="startDockedResizeMethod"
        @keydown="dockedKeyMethod"
      >
        <span class="h-full w-px bg-border-soft" />
      </div>
      <div
        v-show="!chatConfig.enabled || !narrow || mobileView === 'files'"
        :inert="chat.busy || undefined"
        class="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg"
      >
        <FileWorkspace
          ref="fileWorkspaceRef"
          :key="session.number"
          :session="session"
          :active="
            (!chatConfig.enabled || !narrow || mobileView === 'files') &&
            !chat.busy
          "
          :publication="chat.publication"
          :on-reveal="() => (mobileView = 'files')"
          :on-saved="refreshSessionMethod"
          :on-dirty-change="(value) => (hasUnsaved = value)"
          :on-operation-change="(value) => (fileOperationPending = value)"
        />
      </div>
    </div>
  </section>
</template>
