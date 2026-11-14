<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";
import sessionError from "@/helpers/session-error.js";
import { SESSION_STATUS } from "@/helpers/session-status.js";
import NavIcon from "@/components/nav/NavIcon.vue";

const route = useRoute();
const sessionsStore = useSessionsStore();
const session = ref(null);
const error = ref("");
let requestID = 0;

const querySessionDetailsMethod = async () => {
  const currentRequest = ++requestID;
  session.value = null;
  error.value = "";
  try {
    const data = await sessionsStore.getSession(
      Number(route.params.sessionNumber),
    );
    if (currentRequest === requestID) session.value = data;
  } catch (cause) {
    if (currentRequest === requestID) error.value = sessionError(cause);
  }
};

watch(() => route.params.sessionNumber, querySessionDetailsMethod, {
  immediate: true,
});
onUnmounted(() => {
  requestID++;
});
</script>

<template>
  <section class="flex min-h-full flex-col">
    <div v-if="error" class="p-6">
      <p role="alert">{{ error }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg px-3 py-2 text-primary hover:bg-hover"
        @click="querySessionDetailsMethod"
      >
        Retry
      </button>
    </div>
    <p v-else-if="!session" role="status" class="p-6 text-muted">
      Loading session…
    </p>
    <template v-else>
      <header
        class="flex flex-wrap items-center gap-3 border-b border-border-soft px-6 py-4"
      >
        <h1 class="min-w-0 flex-1 text-sm font-semibold">
          {{ session.title }}
        </h1>
        <span
          :class="SESSION_STATUS[session.status].color"
          class="inline-flex items-center gap-1.5 rounded-md bg-current/7 px-2 py-1 text-meta ring-1 ring-border-soft"
        >
          <NavIcon
            :name="SESSION_STATUS[session.status].icon"
            class="size-3.5"
          />
          {{ SESSION_STATUS[session.status].label }}
        </span>
        <a
          :href="session.url"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md px-2 py-1 text-ui text-primary hover:bg-hover"
          >PR #{{ session.number }} ↗</a
        >
      </header>
      <div
        class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
      >
        <p class="text-ui text-muted">{{ session.owner }}/{{ session.repo }}</p>
        <p class="text-muted">The conversation workspace will be added next.</p>
      </div>
    </template>
  </section>
</template>
