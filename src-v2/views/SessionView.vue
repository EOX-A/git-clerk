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
import { useRoute, useRouter } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";
import sessionError from "@/helpers/session-error.js";
import useChatLayout from "@/helpers/use-chat-layout.js";
import useChatStore from "@/stores/chat.js";
import { SessionTopbar } from "@/components/session";
import { FileWorkspace } from "@/components/file-browser";
import { ChatPanel, ChatResizeHandles } from "@/components/chat";
import { getChatConfig } from "@/helpers/chat-config.js";
import NewSessionView from "./NewSessionView.vue";
import useGitStore from "@/stores/git.js";
import { chatPrTitle } from "@/helpers/chat-output.js";
import { brokerGitUsername } from "@/api/git-broker.js";
const chatConfig = getChatConfig();

const route = useRoute();
const router = useRouter();
const gitStore = useGitStore();
const newSession = computed(() => !route.params.sessionNumber);
const connecting = ref(false);
const collapsed = ref(false);
const workspaceKey = ref(0);
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
const temporaryMobile = computed(() => newSession.value && narrow.value);
const floatingOnMobile = computed(
  () => temporaryMobile.value && mobileView.value === "files",
);
const expandButton = ref(null);
const minimizeChatMethod = async () => {
  collapsed.value = true;
  if (narrow.value) mobileView.value = "files";
  await nextTick();
  expandButton.value?.focus();
};
const expandChatMethod = async () => {
  collapsed.value = false;
  if (narrow.value && !newSession.value) mobileView.value = "chat";
  await nextTick();
  workspaceContainer.value
    ?.querySelector('[aria-label="Minimize chat"]')
    ?.focus();
};
watch(narrow, (isNarrow) => {
  if (isNarrow && collapsed.value) mobileView.value = "files";
});
const chatStore = useChatStore();
const conversation = shallowRef(
  chatStore.getConversation(
    newSession.value ? "new" : Number(route.params.sessionNumber),
  ),
);
const chat = computed(() => conversation.value.state);
const starter = computed(
  () => newSession.value && !chat.value.busy && !chat.value.messages.length,
);
const draftTitle = computed(() => {
  const identity = chat.value.draftIdentity;
  const username = brokerGitUsername(gitStore.context);
  return identity?.title && username
    ? chatPrTitle(chatConfig.publishing.prTitle, identity, username)
    : identity?.title;
});
const messages = computed(() => chat.value.messages);
const readOnlyRepo = computed(
  () => gitStore.context?.repository?.permissions?.push === false,
);
const blockedReason = computed(() =>
  newSession.value && readOnlyRepo.value
    ? "This repository is read-only for your current Git broker credentials. You cannot start a new session or save changes."
    : fileOperationPending.value
      ? "Wait for the file operation to finish before asking for another change."
      : hasUnsaved.value
        ? "Save or discard your file edits before asking for another change."
        : "",
);
const sendMethod = (payload) => {
  if (blockedReason.value || (!newSession.value && !session.value?.canEdit))
    return false;
  const accepted = conversation.value.sendMethod(payload, session.value);
  if (accepted && newSession.value && narrow.value) {
    collapsed.value = true;
    mobileView.value = "files";
  }
  return accepted;
};
const retryChatMethod = () => {
  if (!blockedReason.value && (newSession.value || session.value?.canEdit))
    conversation.value.retryMethod();
};
const openPublishedMethod = async () => {
  const number = chat.value.publication?.session.number;
  if (!number || chat.value.busy) return;
  try {
    if (
      !(await router.push({
        name: "session",
        params: { sessionNumber: number },
      }))
    )
      return;
  } catch {
    // Keep the preview visible if navigation fails after a successful save.
  }
  chat.value.error = "The files were saved. Open the session to continue.";
};
watch(
  () => [chat.value.completed, chat.value.busy],
  () => {
    if (newSession.value && chat.value.completed && !chat.value.busy)
      void openPublishedMethod();
  },
);
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

watch(
  () => session.value?.canEdit,
  (editable) => {
    if (editable === false) conversation.value.cancelMethod();
  },
);
const chatUnloadMethod = (event) => {
  if (chatStore.hasSavingConversation()) {
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
  [
    () => route.params.sessionNumber,
    () => chatStore.scopeMethod(),
    () => chatStore.newSessionRevision,
  ],
  async ([number], [previousNumber, previousScope] = []) => {
    const previous = conversation.value;
    conversation.value = chatStore.getConversation(
      number ? Number(number) : "new",
    );
    const published = conversation.value.state.publication?.session;
    if (
      previousScope &&
      !previousNumber &&
      previous === conversation.value &&
      published?.number === Number(number)
    ) {
      // The broker already verified this PR, branch and commit. Promote the live workspace.
      session.value = published;
      await nextTick();
      previous.state.previewFiles = [];
      return;
    }
    const request = ++requestID;
    controller?.abort();
    loading = false;
    connecting.value = false;
    workspaceKey.value++;
    if (published?.number === Number(number)) {
      conversation.value.state.previewFiles = [];
    }
    resetMethod();
    collapsed.value = Boolean(
      number && router.options.history.state.manualSession,
    );
    if (collapsed.value) mobileView.value = "files";
    hasUnsaved.value = false;
    fileOperationPending.value = false;
    session.value = null;
    error.value = "";
    if (number) {
      await querySessionDetailsMethod();
      return;
    }
    connecting.value = true;
    try {
      await sessionsStore.ensureConnected();
    } catch (cause) {
      if (request === requestID) chat.value.error = sessionError(cause);
    } finally {
      if (request === requestID) connecting.value = false;
    }
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
  if (collapsed.value) mobileView.value = "files";
  window.addEventListener("beforeunload", chatUnloadMethod);
  window.addEventListener("focus", backgroundRefreshMethod);
  refreshTimer = window.setInterval(backgroundRefreshMethod, 30000);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", chatUnloadMethod);
  requestID++;
  controller?.abort();
  window.clearInterval(refreshTimer);
  window.removeEventListener("focus", backgroundRefreshMethod);
});
</script>

<template>
  <section class="relative flex h-full min-h-0 flex-col overflow-hidden">
    <NewSessionView
      v-if="starter"
      :key="workspaceKey"
      :connecting="connecting"
      :error="chat.error"
      :on-send="sendMethod"
    />
    <SessionTopbar
      v-else
      :key="`topbar-${workspaceKey}`"
      :temporary="newSession"
      :draft-title="draftTitle"
      :draft-repository="gitStore.context?.repository?.repo"
      :session="session"
      :failed="Boolean(error) && !session"
      :on-updated="refreshSessionMethod"
      :has-unsaved="hasUnsaved || fileOperationPending"
      :mobile-view="mobileView"
      :show-view-switch="narrow && chatConfig.enabled"
      :on-mobile-view="
        (view) => {
          mobileView = view;
          collapsed = newSession && view === 'files';
        }
      "
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
    <div
      v-if="!starter && (session || newSession)"
      :key="workspaceKey"
      ref="workspaceContainer"
      class="relative flex min-h-0 flex-1 overflow-hidden"
    >
      <aside
        v-show="
          chatConfig.enabled &&
          (collapsed || newSession || !narrow || mobileView === 'chat')
        "
        aria-label="Session chat"
        :style="collapsed ? undefined : style"
        :class="
          collapsed
            ? 'absolute right-4 bottom-4 z-[45] rounded-2xl border border-border-soft shadow-floating'
            : floatingOnMobile
              ? 'absolute inset-x-2 bottom-2 z-[45] h-3/5 rounded-2xl border border-border-soft shadow-floating'
              : mode === 'floating'
                ? 'absolute z-[45] rounded-2xl border border-border-soft shadow-floating'
                : mode === 'docked'
                  ? 'relative h-full shrink-0 border-r border-border-soft'
                  : 'h-full w-full'
        "
        class="flex min-h-0 min-w-0 flex-col bg-elev"
      >
        <button
          v-if="collapsed"
          ref="expandButton"
          type="button"
          aria-label="Expand chat"
          class="rounded-2xl bg-primary px-4 py-2 text-ui font-semibold text-on-primary"
          @click="expandChatMethod"
        >
          {{ chatConfig.preset.ui.panelTitle }}
        </button>
        <ChatResizeHandles
          v-if="mode === 'floating' && !collapsed"
          :on-resize="startResizeMethod"
        />
        <ChatPanel
          :mode="
            temporaryMobile ? (floatingOnMobile ? 'floating' : 'docked') : mode
          "
          :expand-on-dock="temporaryMobile"
          v-show="!collapsed"
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
          :active="
            !collapsed && (newSession || !narrow || mobileView === 'chat')
          "
          :compact="
            mode === 'floating'
              ? bounds.w < 470
              : mode === 'docked'
                ? dockedWidth < 470
                : containerWidth < 470
          "
          :on-minimize="minimizeChatMethod"
          :on-dock="() => toggleDockMethod(true)"
          :on-float="() => toggleDockMethod(false)"
          :on-drag-start="narrow ? null : startDragMethod"
          :on-open-file="handleOpenFileMethod"
          :on-open-changes="handleOpenChangesMethod"
          :on-send="sendMethod"
        >
          <template
            v-if="newSession && chat.completed && !chat.busy"
            #after-progress
          >
            <button
              type="button"
              class="rounded px-3 py-2 text-primary hover:bg-hover"
              @click="openPublishedMethod"
            >
              View session #{{ chat.session.number }}
            </button>
          </template>
        </ChatPanel>
      </aside>
      <div
        v-if="chatConfig.enabled && mode === 'docked' && !collapsed"
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
        :inert="(!newSession && chat.busy) || undefined"
        class="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg"
      >
        <FileWorkspace
          ref="fileWorkspaceRef"
          :draft-files="chat.previewFiles"
          :session="session"
          :active="
            (!chatConfig.enabled || !narrow || mobileView === 'files') &&
            !newSession &&
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
