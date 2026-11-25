<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";

import { chatDraftIdentity, chatOutputPath } from "@/helpers/chat-output.js";
defineEmits(["cancel"]);
const props = defineProps({ blankOutput: { type: String, default: null } });
const router = useRouter();
const sessionsStore = useSessionsStore();
const snackbar = inject("set-snackbar");
const input = ref(null);
const name = ref(""),
  busy = ref(false),
  error = ref(""),
  progress = ref("");
const attempt = {};
let initialFiles;
const started = ref(false);
const created = ref(null);
const allowed = computed(
  () => Boolean(name.value.trim()) && name.value.trim().length <= 256,
);
defineExpose({ busy });
const createMethod = async () => {
  if (busy.value || !allowed.value) return;
  busy.value = true;
  error.value = "";
  try {
    if (props.blankOutput && !attempt.title) {
      const { id } = chatDraftIdentity(name.value, "narrative");
      initialFiles = { [chatOutputPath(props.blankOutput, null, id)]: "" };
    }
    created.value ||= await sessionsStore.createSession(
      name.value,
      attempt,
      (text) => (progress.value = text),
      initialFiles,
    );
    progress.value = "Opening your session…";
    const failure = await router.push({
      name: "session",
      params: { sessionNumber: created.value.number },
      state: { manualSession: true },
    });
    if (failure) {
      error.value =
        "Your session was created. Click Open session to try opening it again.";
      return;
    }
    snackbar.value = {
      text: "Session created",
      description: created.value.title,
      status: "success",
    };
  } catch (cause) {
    if (cause.status === 401)
      error.value = "Your workspace session expired. Sign in again and retry.";
    else if (cause.status === 403)
      error.value =
        "The Git broker denied session creation. Check your workspace access and configured username.";
    else
      error.value =
        cause.message ||
        "Could not create the session. Check the Git broker connection and retry.";
  } finally {
    busy.value = false;
    started.value = Boolean(attempt.title);
  }
};
const canNavigate = (to) =>
  !busy.value ||
  (to.name === "session" &&
    Number(to.params.sessionNumber) === created.value?.number);
onBeforeRouteLeave(canNavigate);
onBeforeRouteUpdate(canNavigate);
const unloadMethod = (event) => {
  if (busy.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};
onMounted(() => {
  if (!props.blankOutput) input.value?.focus();
  window.addEventListener("beforeunload", unloadMethod);
});
onUnmounted(() => window.removeEventListener("beforeunload", unloadMethod));
</script>

<template>
  <form
    :class="{ 'space-y-5': !blankOutput }"
    aria-labelledby="create-session-title"
    :aria-busy="busy"
    @submit.prevent="createMethod"
  >
    <header>
      <h2
        v-if="blankOutput"
        id="create-session-title"
        class="text-base font-semibold"
      >
        Start with a blank narrative
      </h2>
      <h1
        v-else
        id="create-session-title"
        class="text-heading font-semibold text-balance"
      >
        Create a session
      </h1>
      <p
        v-if="blankOutput"
        id="create-session-description"
        class="mt-2 text-ui text-muted"
      >
        Give your session a name to start writing your narrative.
      </p>
      <p v-else class="mt-2 text-sm text-muted">
        Group your file changes in a draft session, then submit them for review.
      </p>
    </header>
    <div :class="{ 'mt-5': blankOutput }">
      <label for="new-session-name" class="block text-ui font-medium"
        >Session name</label
      >
      <input
        id="new-session-name"
        ref="input"
        v-model="name"
        type="text"
        required
        maxlength="256"
        autocomplete="off"
        :placeholder="blankOutput ? 'e.g. Arctic sea ice trends' : undefined"
        :disabled="busy || started || Boolean(created)"
        :aria-invalid="error && !allowed ? true : undefined"
        class="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2 text-ui disabled:opacity-60"
      />
    </div>
    <p
      v-if="busy"
      role="status"
      class="mt-3 flex items-center gap-2 text-ui text-muted"
    >
      <span
        aria-hidden="true"
        class="size-3.5 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
      />{{ progress }}
    </p>
    <p v-if="error" role="alert" class="mt-3 text-ui text-closed">
      {{ error }}
    </p>
    <div :class="blankOutput && 'mt-6 flex justify-end gap-2'">
      <button
        v-if="blankOutput"
        type="button"
        :disabled="busy"
        class="rounded-lg px-3 py-2 text-ui hover:bg-hover disabled:opacity-40"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="busy || !allowed"
        :class="blankOutput ? 'px-3 py-2' : 'px-4 py-2.5'"
        class="rounded-lg bg-primary text-ui font-semibold text-on-primary disabled:opacity-40"
      >
        {{
          busy
            ? "Creating…"
            : created
              ? "Open session"
              : error
                ? "Retry"
                : blankOutput
                  ? "Create New Session"
                  : "Create session"
        }}
      </button>
    </div>
  </form>
</template>
