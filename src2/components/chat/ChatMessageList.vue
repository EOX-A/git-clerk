<script setup>
import ChatIcon from "./ChatIcon.vue";
import { splitFilePath } from "@/helpers/chat-dummy.js";

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
      class="relative flex flex-col pl-[22px]"
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
        {{ msg.role === "user" ? "YOU" : "GIT CLERK" }}
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
        <div
          class="max-w-[68ch] whitespace-pre-wrap break-words text-sm leading-[22px] text-pretty text-text"
        >
          {{ msg.text }}
        </div>

        <!-- Changed-files card -->
        <div
          v-if="msg.files?.length || msg.showChanges"
          class="mt-3.5 flex max-w-[580px] flex-col items-start gap-1.5"
        >
          <div
            v-if="msg.files?.length"
            class="flex w-full flex-col gap-[1px] overflow-hidden rounded-xl border border-border-soft bg-border-soft"
          >
            <button
              v-for="file in msg.files"
              :key="file.path"
              type="button"
              :aria-label="`Open ${file.path}, ${file.status}`"
              :title="file.path"
              class="flex w-full items-center gap-2.5 bg-elev px-3 py-2 text-left text-text hover:bg-hover"
              @click="onOpenFile?.(file.path)"
              :disabled="!onOpenFile"
            >
              <span
                :class="
                  file.status === 'Added'
                    ? 'text-add-fg'
                    : file.status === 'Deleted'
                      ? 'text-del-fg'
                      : 'text-warn'
                "
                class="flex shrink-0"
              >
                <ChatIcon
                  :name="file.status === 'Added' ? 'file-plus' : 'file-diff'"
                  class="size-4"
                />
              </span>
              <span
                class="flex min-w-0 flex-1 font-mono text-[12.5px] leading-5 whitespace-nowrap"
              >
                <span class="min-w-0 shrink truncate text-muted">{{
                  splitFilePath(file.path).dir
                }}</span>
                <span class="min-w-0 truncate font-medium">{{
                  splitFilePath(file.path).name
                }}</span>
              </span>
              <span
                :class="
                  file.status === 'Added'
                    ? 'text-add-fg'
                    : file.status === 'Deleted'
                      ? 'text-del-fg'
                      : 'text-warn'
                "
                class="shrink-0 text-meta font-medium"
              >
                {{ file.status }}
              </span>
            </button>
          </div>
          <button
            type="button"
            class="-ml-2 inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-primary hover:bg-hover"
            @click="onOpenChanges?.()"
            :disabled="!onOpenChanges"
          >
            <ChatIcon name="diff" class="size-[15px]" />
            <span>View changes</span>
          </button>
        </div>
      </template>

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
