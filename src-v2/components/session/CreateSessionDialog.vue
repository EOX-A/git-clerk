<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, ref } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";

const props = defineProps({ onClose: { type: Function, required: true } });
const router = useRouter();
const sessionsStore = useSessionsStore();
const snackbar = inject("set-snackbar");
const dialog = ref(null),
  input = ref(null);
const name = ref(""),
  busy = ref(false),
  error = ref(""),
  progress = ref("");
const attempt = {};
const started = ref(false);
const created = ref(null);
const allowed = computed(
  () => Boolean(name.value.trim()) && name.value.trim().length <= 256,
);
let previousFocus;
const closeMethod = () => {
  if (!busy.value) props.onClose();
};
const createMethod = async () => {
  if (busy.value || !allowed.value) return;
  busy.value = true;
  error.value = "";
  try {
    created.value ||= await sessionsStore.createSession(
      name.value,
      attempt,
      (text) => (progress.value = text),
    );
    progress.value = "Opening your session…";
    const failure = await router.push({
      name: "session",
      params: { sessionNumber: created.value.number },
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
    props.onClose();
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
onBeforeRouteLeave(() => !busy.value || Boolean(created.value));
const unloadMethod = (event) => {
  if (busy.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};
onMounted(async () => {
  previousFocus = document.activeElement;
  dialog.value.showModal();
  await nextTick();
  input.value.focus();
  window.addEventListener("beforeunload", unloadMethod);
});
onUnmounted(() => {
  window.removeEventListener("beforeunload", unloadMethod);
  if (previousFocus?.isConnected) previousFocus.focus();
});
</script>
<template>
  <dialog
    ref="dialog"
    aria-modal="true"
    aria-labelledby="create-session-title"
    aria-describedby="create-session-description"
    :aria-busy="busy"
    class="m-auto max-h-[90dvh] w-[480px] max-w-[calc(100vw-32px)] overflow-auto rounded-2xl border border-border-soft bg-elev p-6 text-text shadow-floating backdrop:bg-scrim"
    @cancel.prevent="closeMethod"
  >
    <form @submit.prevent="createMethod">
      <h2 id="create-session-title" class="text-base font-semibold">
        Create New Session
      </h2>
      <p id="create-session-description" class="mt-2 text-ui text-muted">
        Begin a new session to add a new content or propose a file change.
      </p>
      <aside
        aria-labelledby="session-info-title"
        class="mt-4 flex gap-2.5 rounded-lg bg-add-bg p-4 text-add-fg"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          aria-hidden="true"
          class="mt-0.5 size-[18px] shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <circle cx="12" cy="7" r=".75" fill="currentColor" stroke="none" />
        </svg>
        <div>
          <h3 id="session-info-title" class="text-ui font-semibold">
            What is a session?
          </h3>
          <p class="mt-1 text-ui">
            A session lets you group and review edits to multiple files before
            submitting them for approval. Original files stay unchanged until
            approved.
          </p>
        </div>
      </aside>
      <label for="new-session-name" class="mt-5 block text-ui font-medium"
        >Session Name</label
      >
      <input
        id="new-session-name"
        ref="input"
        v-model="name"
        type="text"
        required
        maxlength="256"
        autocomplete="off"
        placeholder="What would you like to change?"
        :disabled="busy || started || Boolean(created)"
        :aria-invalid="error && !allowed ? true : undefined"
        class="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2 text-ui disabled:opacity-60"
      />
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
      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          :disabled="busy"
          class="rounded-lg px-3 py-2 text-ui hover:bg-hover disabled:opacity-40"
          @click="closeMethod"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="busy || !allowed"
          class="rounded-lg bg-primary px-3 py-2 text-ui font-semibold text-on-primary disabled:opacity-40"
        >
          {{
            busy
              ? "Creating…"
              : created
                ? "Open session"
                : error
                  ? "Retry"
                  : "Create New Session"
          }}
        </button>
      </div>
    </form>
  </dialog>
</template>
