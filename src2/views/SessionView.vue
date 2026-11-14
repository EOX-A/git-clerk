<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";
import sessionError from "@/helpers/session-error.js";
import { SessionTopbar } from "@/components/session";
import { FileWorkspace } from "@/components/file-browser";

const route = useRoute();
const sessionsStore = useSessionsStore();
const session = ref(null);
const error = ref("");
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
    if (currentRequest === requestID) session.value = data;
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
watch(
  () => route.params.sessionNumber,
  () => querySessionDetailsMethod(),
  { immediate: true },
);
onMounted(() => {
  window.addEventListener("focus", backgroundRefreshMethod);
  refreshTimer = window.setInterval(backgroundRefreshMethod, 30000);
});
onUnmounted(() => {
  requestID++;
  controller?.abort();
  window.clearInterval(refreshTimer);
  window.removeEventListener("focus", backgroundRefreshMethod);
});
</script>

<template>
  <section class="flex h-full min-h-0 flex-col">
    <SessionTopbar
      :key="route.params.sessionNumber"
      :session="session"
      :failed="Boolean(error) && !session"
      :on-updated="refreshSessionMethod"
    />
    <div v-if="error" class="p-6">
      <p role="alert">{{ error }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg px-3 py-2 text-primary hover:bg-hover"
        @click="refreshSessionMethod"
      >
        Retry
      </button>
    </div>
    <FileWorkspace v-if="session" :key="session.number" :session="session" />
  </section>
</template>
