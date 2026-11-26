<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import useChatStore from "@/stores/chat.js";
import useGitStore from "@/stores/git.js";
import useScrollbar from "@/helpers/use-scrollbar.js";
import useChatAutoscroll from "@/helpers/use-chat-autoscroll.js";
import ChatComposer from "./ChatComposer.vue";
import ChatIcon from "./ChatIcon.vue";
import ChatMessageList from "./ChatMessageList.vue";
import ChatProgress from "./ChatProgress.vue";
import ChatSessionWelcome from "./ChatSessionWelcome.vue";
import { getChatConfig } from "@/helpers/chat-config.js";
const chatConfig = getChatConfig();
const chatStore = useChatStore();
const gitStore = useGitStore();
const isRepoReadOnly = computed(
  () => gitStore.context?.repository?.permissions?.push === false,
);

const props = defineProps({
  session: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: "floating", // 'floating' | 'docked' | 'mobile'
  },
  messages: {
    type: Array,
    default: () => [],
  },
  expandOnDock: Boolean,
  busy: Boolean,
  phase: { type: String, default: "idle" },
  progress: { type: String, default: "" },
  blockedReason: { type: String, default: "" },
  error: { type: String, default: "" },
  canRetry: Boolean,
  canStop: Boolean,
  onRetry: { type: Function, default: null },
  onStop: { type: Function, default: null },
  active: { type: Boolean, default: true },
  compact: {
    type: Boolean,
    default: false,
  },
  onMinimize: { type: Function, required: true },
  onDock: {
    type: Function,
    default: null,
  },
  onFloat: {
    type: Function,
    default: null,
  },
  onOpenFile: {
    type: Function,
    default: null,
  },
  onOpenChanges: {
    type: Function,
    default: null,
  },
  onSend: {
    type: Function,
    default: null,
  },
  onDragStart: {
    type: Function,
    default: null,
  },
});

const scroller = ref(null);
const pinned = ref(true);
const messageContent = useChatAutoscroll(
  scroller,
  computed(() => pinned.value && props.messages.length > 0),
);
const { isScrolling, scrollMethod } = useScrollbar();
const scrollMessagesMethod = () => {
  scrollMethod();
  const element = scroller.value;
  pinned.value =
    element.scrollHeight - element.scrollTop - element.clientHeight < 48;
};
const scrollBottomMethod = async () => {
  await nextTick();
  if (scroller.value)
    scroller.value.scrollTop = props.messages.length
      ? scroller.value.scrollHeight
      : 0;
};
watch(
  () => [
    props.messages.at(-1)?.id,
    props.messages.at(-1)?.text,
    props.messages.at(-1)?.files?.length,
  ],
  () => {
    if (pinned.value || props.messages.at(-1)?.role === "user")
      scrollBottomMethod();
  },
);
watch(
  () => [props.mode, props.active],
  () => {
    if (pinned.value) scrollBottomMethod();
  },
);
onMounted(scrollBottomMethod);

const isClosed = computed(() =>
  ["merged", "closed"].includes(props.session?.status?.toLowerCase()),
);
const isReadOnly = computed(
  () => isClosed.value || props.session?.canEdit === false,
);

const headerPointerDownMethod = (event) => {
  if (props.mode !== "floating") return;
  // Ignore clicks on buttons/interactive elements inside the header
  if (event.target.closest("button, a, input, textarea")) return;
  props.onDragStart?.(event);
};
</script>

<template>
  <div
    class="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[inherit] bg-elev"
  >
    <!-- Header bar -->
    <div
      :title="mode === 'floating' && onDragStart ? 'Drag to move' : undefined"
      :class="
        mode === 'floating' && onDragStart
          ? 'cursor-grab active:cursor-grabbing touch-none select-none'
          : 'cursor-default'
      "
      class="flex h-[42px] shrink-0 items-center gap-2 bg-primary pr-1.5 pl-4 text-on-primary"
      @pointerdown="headerPointerDownMethod"
    >
      <span
        class="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-0.01em]"
      >
        {{ chatConfig.preset.ui.panelTitle }}
      </span>
      <button
        v-if="mode === 'floating'"
        data-chat-mode-button
        type="button"
        :disabled="!onDock"
        :aria-label="expandOnDock ? 'Expand chat' : 'Dock chat to the left'"
        :title="expandOnDock ? 'Expand chat' : 'Dock chat to the left'"
        class="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] text-on-primary hover:bg-white/16"
        @click.stop="onDock?.()"
      >
        <ChatIcon
          :name="expandOnDock ? 'expand' : 'dock-left'"
          class="size-4"
        />
      </button>
      <button
        v-else-if="mode === 'docked'"
        data-chat-mode-button
        type="button"
        aria-label="Float chat over the visualizer"
        title="Float chat over the visualizer"
        class="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] text-on-primary hover:bg-white/16"
        @click.stop="onFloat?.()"
      >
        <ChatIcon name="pip" class="size-4" />
      </button>
      <button
        type="button"
        aria-label="Minimize chat"
        title="Minimize chat"
        class="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] hover:bg-white/16"
        @click.stop="onMinimize"
      >
        <ChatIcon name="minimize" class="size-4" />
      </button>
    </div>

    <!-- Scrollable Messages Area -->
    <div
      ref="scroller"
      role="log"
      aria-label="Session conversation"
      tabindex="0"
      :data-scrolling="isScrolling"
      class="nav-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
      @scroll="scrollMessagesMethod"
    >
      <div
        ref="messageContent"
        class="mx-auto flex min-w-0 max-w-[744px] flex-col gap-5 px-6 py-5.5"
      >
        <ChatSessionWelcome
          v-if="!messages.length && session"
          :session="session"
          :on-open-changes="onOpenChanges"
        />
        <ChatMessageList
          v-else
          :messages="messages"
          :on-open-file="onOpenFile"
        />
      </div>
    </div>

    <!-- Bottom: Composer or Read-Only Banner -->
    <div class="max-h-[65%] shrink-0 overflow-y-auto px-4 pt-0 pb-5 sm:px-6">
      <div class="mx-auto flex max-w-[696px] flex-col gap-2">
        <!-- Read-Only Banner -->
        <div
          v-if="isReadOnly"
          :class="
            session?.status?.toLowerCase() === 'merged'
              ? 'border-merged/32 bg-merged/8'
              : 'border-closed/32 bg-closed/8'
          "
          class="flex flex-wrap items-center justify-center gap-2 rounded-2xl border p-3.5 text-ui text-text"
        >
          <ChatIcon
            :name="
              session?.status?.toLowerCase() === 'merged' ? 'check-circle' : 'x'
            "
            :class="
              session?.status?.toLowerCase() === 'merged'
                ? 'text-merged'
                : 'text-closed'
            "
            class="size-4 shrink-0"
          />
          <span>
            {{
              isClosed
                ? `PR #${session?.number} is ${session?.status?.toLowerCase()}.`
                : isRepoReadOnly
                  ? `PR #${session?.number} is read-only.`
                  : `PR #${session?.number} is read-only for this account.`
            }}
            {{
              isRepoReadOnly
                ? "This repository is read-only for your current Git broker credentials."
                : "Start a new session to make changes."
            }}
          </span>
          <button
            v-if="!isRepoReadOnly"
            type="button"
            @click="chatStore.startNewSession()"
            class="rounded-md px-1.5 py-1 text-ui font-medium text-primary hover:bg-hover"
          >
            New session
          </button>
        </div>

        <ChatProgress
          v-if="!isReadOnly"
          :existing-session="Boolean(session)"
          :busy="busy"
          :phase="phase"
          :progress="progress"
          :error="error"
          :can-retry="chatConfig.publishing.enabled && canRetry"
          :can-stop="canStop"
          :on-retry="onRetry"
          :on-stop="onStop"
        />
        <slot name="after-progress" />
        <p
          v-if="!isReadOnly && blockedReason"
          role="status"
          class="text-ui text-muted"
        >
          {{ blockedReason }}
        </p>
        <ChatComposer
          v-if="!isReadOnly"
          :placeholder="chatConfig.preset.ui.followUpPlaceholder"
          :compact="compact"
          :busy="busy"
          :blocked-reason="blockedReason"
          :active="active"
          :on-send="onSend"
        />
      </div>
    </div>
  </div>
</template>
