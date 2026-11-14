<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { updateSessionDetails } from "@/api/index.js";
import { canSubmitSession } from "@/helpers/session-checks.js";

const props = defineProps({
  session: { type: Object, required: true },
  action: { type: String, required: true },
  onClose: { type: Function, required: true },
  onUpdated: { type: Function, required: true },
});
const dialog = ref(null);
const titleInput = ref(null);
const cancelButton = ref(null);
const title = ref(props.session.title);
const busy = ref(false);
const error = ref("");
const labels = {
  rename: "Rename session",
  delete: "Delete session",
  review: "Submit for review",
};
const allowed = computed(() =>
  props.action === "rename"
    ? props.session.canManage &&
      Boolean(title.value.trim()) &&
      title.value.trim() !== props.session.title
    : props.action === "delete"
      ? props.session.canDelete
      : canSubmitSession(props.session),
);
let previousFocus;
const closeMethod = () => {
  if (!busy.value) props.onClose();
};
const submitMethod = async () => {
  if (busy.value || !allowed.value) return;
  busy.value = true;
  error.value = "";
  try {
    await updateSessionDetails(props.session.number, props.action, title.value);
    await props.onUpdated();
    props.onClose();
  } catch (cause) {
    if (cause.code === "SESSION_BRANCH_DELETE_FAILED") {
      error.value =
        "The PR was closed, but its branch could not be deleted. Open the PR on GitHub to finish removing the branch.";
    } else {
      error.value =
        "GitHub could not complete this action. Check your access and the session's current state, then try again.";
    }
    await props.onUpdated();
  } finally {
    busy.value = false;
  }
};
onMounted(async () => {
  previousFocus = document.activeElement;
  dialog.value.showModal();
  await nextTick();
  if (props.action === "rename") {
    titleInput.value.focus();
    titleInput.value.select();
  } else cancelButton.value.focus();
});
onUnmounted(() => {
  if (previousFocus?.isConnected) previousFocus.focus();
});
</script>

<template>
  <dialog
    ref="dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="session-action-title"
    aria-describedby="session-action-description"
    :aria-busy="busy"
    class="m-auto w-[420px] max-w-[calc(100vw-32px)] rounded-2xl border border-border-soft bg-elev p-6 text-text shadow-floating backdrop:bg-scrim"
    @cancel.prevent="closeMethod"
  >
    <form @submit.prevent="submitMethod">
      <h2 id="session-action-title" class="text-base font-semibold">
        {{ action === "delete" ? "Delete this session?" : labels[action] }}
      </h2>
      <p id="session-action-description" class="mt-3 text-ui text-muted">
        <template v-if="action === 'delete'"
          >This closes PR #{{ session.number
          }}<template v-if="session.headRefID">
            and deletes
            <span class="font-mono break-all"
              >{{ session.headOwner }}/{{ session.headRepo }}:{{
                session.branch
              }}</span
            ></template
          >. The PR and its discussion remain on GitHub.</template
        >
        <template v-else-if="action === 'review'"
          >Move draft PR #{{ session.number }} into review?</template
        >
        <template v-else
          >Update the title of PR #{{ session.number }}.</template
        >
      </p>
      <label v-if="action === 'rename'" class="mt-4 block text-ui"
        >Session title
        <input
          ref="titleInput"
          v-model="title"
          required
          maxlength="256"
          :disabled="busy"
          class="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2"
        />
      </label>
      <p v-if="error" role="alert" class="mt-3 text-ui text-closed">
        {{ error }}
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button
          ref="cancelButton"
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
          :class="
            action === 'delete'
              ? 'bg-closed text-white'
              : 'bg-primary text-on-primary'
          "
          class="rounded-lg px-3 py-2 text-ui font-semibold disabled:opacity-40"
        >
          {{ busy ? "Updating…" : labels[action] }}
        </button>
      </div>
    </form>
  </dialog>
</template>
