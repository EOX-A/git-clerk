<script setup>
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";
import { SESSION_STATUS } from "@/helpers/session-status.js";
import NavIcon from "@/components/nav/NavIcon.vue";
import SessionListPlaceholder from "@/components/nav/SessionListPlaceholder.vue";

defineProps({ onSelectSession: { type: Function, required: true } });

const route = useRoute();
const sessionsStore = useSessionsStore();
const { sessions, loading, error, pageInfo } = storeToRefs(sessionsStore);
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2" :aria-busy="loading">
    <p
      v-if="!loading && !error && !sessions.length"
      class="px-2.5 py-3.5 text-ui text-muted"
    >
      No sessions yet.
    </p>
    <ul v-if="sessions.length" class="space-y-px">
      <li v-for="session in sessions" :key="session.id">
        <button
          type="button"
          :aria-label="`${session.title}, PR #${session.number}, ${SESSION_STATUS[session.status].label}`"
          :aria-current="
            Number(route.params.sessionNumber) === session.number
              ? 'page'
              : undefined
          "
          :title="`${session.title} · ${SESSION_STATUS[session.status].label}`"
          :class="
            Number(route.params.sessionNumber) === session.number
              ? 'bg-elev font-medium shadow-selected'
              : 'hover:bg-hover'
          "
          class="flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left"
          @click="onSelectSession(session)"
        >
          <NavIcon
            :name="SESSION_STATUS[session.status].icon"
            :class="SESSION_STATUS[session.status].color"
            class="mt-0.5 size-4"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-ui">{{ session.title }}</span>
            <span class="block truncate text-meta font-normal text-muted"
              >#{{ session.number }} · {{ session.repo }}</span
            >
          </span>
        </button>
      </li>
    </ul>
    <div v-if="loading" role="status">
      <span class="sr-only">{{
        sessions.length ? "Loading more sessions…" : "Loading sessions…"
      }}</span>
      <SessionListPlaceholder :rows="sessions.length ? 3 : 6" />
    </div>
    <div v-if="error" class="px-2.5 py-3.5">
      <p role="alert" class="text-ui text-muted">{{ error }}</p>
      <button
        type="button"
        class="mt-2 min-h-9 rounded-lg px-2 text-ui font-medium text-primary hover:bg-hover"
        :disabled="loading"
        @click="sessionsStore.loadSessions()"
      >
        Retry
      </button>
    </div>
    <button
      v-else-if="!loading && pageInfo?.hasNextPage"
      type="button"
      :disabled="loading"
      class="mt-2 min-h-9 w-full rounded-lg px-2 text-ui text-primary hover:bg-hover disabled:opacity-50"
      @click="sessionsStore.loadSessions()"
    >
      Load more sessions
    </button>
  </div>
</template>
