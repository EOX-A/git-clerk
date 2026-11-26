<script setup>
import { computed } from "vue";
import ChatIcon from "./ChatIcon.vue";
import { SESSION_STATUS, sessionTag } from "@/helpers/session-status.js";
import { sessionChecks } from "@/helpers/session-checks.js";
import { chatPullRequestUrl } from "@/helpers/chat-markdown.js";
import { getChatConfig } from "@/helpers/chat-config.js";
const ui = getChatConfig().preset.ui;

const props = defineProps({
  session: { type: Object, required: true },
  onOpenChanges: { type: Function, default: null },
});
const status = computed(() => SESSION_STATUS[sessionTag(props.session)]);
const checks = computed(() => sessionChecks(props.session));
const url = computed(() => chatPullRequestUrl(props.session));
const readOnly = computed(() => !props.session.canEdit);
const updated = computed(() => {
  const date = new Date(props.session.updatedAt);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
});
</script>

<template>
  <div class="relative min-w-0 pl-[22px]">
    <span
      aria-hidden="true"
      class="absolute top-1 left-0 size-[7px] rounded-xs bg-primary"
    />
    <p
      class="mb-2 text-[11px] font-semibold tracking-[0.07em] text-primary uppercase"
    >
      {{ ui.assistantName }}
    </p>
    <p class="text-sm leading-[22px] text-text">
      {{ readOnly ? ui.readOnlyWelcome : ui.welcome }}
    </p>
    <section
      aria-label="Current pull request summary"
      class="mt-4 overflow-hidden rounded-xl border border-border-soft bg-elev"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-surface/60 px-3 py-2.5"
      >
        <span class="text-meta font-medium text-muted"
          >Current PR · #{{ session.number }}</span
        >
        <span
          v-if="status"
          :class="status.color"
          class="rounded-md bg-elev px-2 py-0.5 text-meta font-medium"
          >{{ status.label }}</span
        >
      </div>
      <div class="space-y-3 p-3">
        <p class="text-ui leading-5 font-semibold break-words text-text">
          {{ session.title }}
        </p>
        <div class="min-w-0 space-y-1 font-mono text-[11px] text-muted">
          <p class="truncate" :title="`${session.owner}/${session.repo}`">
            {{ session.owner }}/{{ session.repo }}
          </p>
          <p v-if="session.branch" class="truncate" :title="session.branch">
            {{ session.branch }}
          </p>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-2 text-meta">
          <span class="inline-flex items-center gap-1.5 text-muted">
            <ChatIcon name="files" class="size-3.5" />
            {{ session.changedFiles ?? 0 }}
            {{ session.changedFiles === 1 ? "changed file" : "changed files" }}
          </span>
          <span :class="checks?.color || 'text-muted'">{{
            checks?.label || "No checks reported"
          }}</span>
        </div>
        <p v-if="updated" class="text-[11px] text-muted">
          Updated {{ updated }}
        </p>
      </div>
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-soft px-3 py-2.5 text-meta font-medium text-primary"
      >
        <button
          v-if="onOpenChanges"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-sm hover:underline underline-offset-4"
          @click="onOpenChanges()"
        >
          <ChatIcon name="diff" class="size-3.5" /> View PR changes
        </button>
        <a
          v-if="url"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-sm hover:underline underline-offset-4"
          >View in repository ↗</a
        >
      </div>
    </section>
  </div>
</template>
