<script setup>
import { computed } from "vue";
import ChatIcon from "./ChatIcon.vue";
import { chatPullRequestUrl } from "@/helpers/chat-markdown.js";
const props = defineProps({ pr: { type: Object, required: true } });
const url = computed(() => chatPullRequestUrl(props.pr));
</script>
<template>
  <section
    aria-label="Pull request"
    class="mt-3 rounded-xl border border-border-soft bg-elev p-3.5"
  >
    <div class="mb-2 flex items-center gap-2 text-meta font-medium text-add-fg">
      <ChatIcon name="check-circle" class="size-4" />
      {{
        pr.draft
          ? "Draft saved"
          : pr.updated
            ? "Pull request updated"
            : "Pull request created"
      }}
    </div>
    <router-link
      :to="{ name: 'session', params: { sessionNumber: pr.number } }"
      class="block text-ui font-semibold text-primary hover:underline"
    >
      #{{ pr.number }} · {{ pr.title }}
    </router-link>
    <p
      v-if="pr.branch"
      :title="pr.branch"
      class="mt-1.5 truncate font-mono text-[11px] text-muted"
    >
      {{ pr.branch }}
    </p>
    <a
      v-if="url"
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 inline-flex rounded-md text-meta font-medium text-primary underline-offset-4 hover:underline"
      >View in repository ↗</a
    >
  </section>
</template>
