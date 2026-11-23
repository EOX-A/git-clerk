<script setup>
import ChatIcon from "./ChatIcon.vue";
import ChatMarkdown from "./ChatMarkdown.vue";
import ChatFileCard from "./ChatFileCard.vue";
import ChatPullRequest from "./ChatPullRequest.vue";
import { getChatConfig } from "@/helpers/chat-config.js";
const { ui, outputFile } = getChatConfig().preset;
const pathTemplate = outputFile?.includes("<id>")
  ? outputFile.replace(/^\//, "")
  : null;

defineProps({
  onOpenFile: { type: Function, default: null },
  onOpenChanges: { type: Function, default: null },
  messages: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="flex flex-col gap-5">
    <div
      v-for="(msg, index) in messages"
      :key="msg.id || index"
      class="relative flex min-w-0 flex-col pl-[22px]"
    >
      <!-- Timeline rail line connecting messages -->
      <span
        aria-hidden="true"
        :style="{ bottom: index === messages.length - 1 ? '4px' : '-20px' }"
        class="absolute top-2.5 left-[3px] w-[1px] bg-border"
      />
      <!-- Timeline marker -->
      <span
        aria-hidden="true"
        :class="msg.role === 'user' ? 'bg-muted/70' : 'bg-primary'"
        class="absolute top-1 left-0 size-[7px] rounded-xs"
      />
      <!-- Role label -->
      <div
        :class="msg.role === 'user' ? 'text-muted' : 'text-primary'"
        class="mb-1 text-[11px] leading-[15px] font-semibold tracking-[0.07em] uppercase"
      >
        {{ msg.role === "user" ? "YOU" : ui.assistantName }}
      </div>

      <!-- User message body -->
      <div
        v-if="msg.role === 'user'"
        class="text-sm leading-[22px] whitespace-pre-wrap break-words text-text"
      >
        {{ msg.text }}
        <ul
          v-if="msg.attachments?.length"
          aria-label="Message attachments"
          class="mt-2 flex flex-wrap gap-1.5"
        >
          <li
            v-for="(file, fileIndex) in msg.attachments"
            :key="fileIndex"
            :title="file.name"
            class="flex max-w-full items-center gap-1 rounded-md border border-border-soft px-2 py-1 text-meta text-muted"
          >
            <ChatIcon name="file" class="size-3.5 shrink-0" /><span
              class="truncate"
              >{{ file.name }}</span
            >
          </li>
        </ul>
      </div>

      <!-- Assistant message body -->
      <template v-else-if="msg.role === 'assistant'">
        <ChatMarkdown
          :text="msg.text"
          :streaming="msg.streaming"
          :revealing="msg.revealing"
          :activity="msg.activity"
        />
        <ChatPullRequest v-if="msg.pr" :pr="msg.pr" />
        <ChatFileCard
          v-if="msg.files?.length || (msg.streaming && pathTemplate)"
          :files="msg.files"
          :stage="msg.fileStage || 'saved'"
          :path-template="pathTemplate"
          :pending="
            Boolean(msg.streaming && pathTemplate && !msg.files?.length)
          "
          :on-open-file="onOpenFile"
          :on-open-changes="onOpenChanges"
        />
        <button
          v-else-if="msg.showChanges && onOpenChanges"
          type="button"
          class="mt-2 self-start rounded-md px-2 py-1 text-ui text-primary hover:bg-hover"
          @click="onOpenChanges()"
        >
          View changes
        </button>
      </template>

      <p v-else-if="msg.role === 'error'" class="text-ui text-del-fg">
        {{ msg.text }}
      </p>
      <!-- Status message -->
      <div
        v-else-if="msg.role === 'status'"
        class="flex items-center gap-2.5 text-ui leading-[22px] text-muted"
      >
        <span
          class="inline-block size-3.5 shrink-0 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <span>{{ msg.text }}</span>
      </div>
    </div>
  </div>
</template>
