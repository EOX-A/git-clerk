<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from "vue";
import { SESSION_STATUS } from "@/helpers/session-status.js";
import { canSubmitSession, sessionChecks } from "@/helpers/session-checks.js";
import SessionIcon from "./SessionIcon.vue";
import SessionOptions from "./SessionOptions.vue";
import SessionActionDialog from "./SessionActionDialog.vue";

const props = defineProps({
  session: { type: Object, default: null },
  failed: { type: Boolean, default: false },
  hasUnsaved: Boolean,
  onUpdated: { type: Function, required: true },
  showViewSwitch: Boolean,
  mobileView: { type: String, default: "chat" },
  onMobileView: { type: Function, default: null },
});
const sidebar = inject("session-sidebar");
const snackbar = inject("set-snackbar");
const header = ref(null);
const wide = ref(true);
const action = ref("");
const copyState = ref("");
const copying = ref(false);
let copyTimer;
let disposed = false;
const copyBranchMethod = async () => {
  if (!props.session?.branch || copying.value) return;
  copying.value = true;
  window.clearTimeout(copyTimer);
  try {
    await navigator.clipboard.writeText(props.session.branch);
    if (disposed) return;
    copyState.value = "Copied";
    snackbar.value = {
      text: "Branch name copied",
      description: props.session.branch,
      status: "success",
    };
  } catch {
    if (disposed) return;
    copyState.value =
      "Could not copy. Select the branch name and copy it manually.";
    snackbar.value = { text: copyState.value, status: "error" };
  } finally {
    copying.value = false;
  }
  copyTimer = window.setTimeout(() => {
    copyState.value = "";
  }, 2000);
};
const status = computed(() =>
  props.session ? SESSION_STATUS[props.session.status] : null,
);
const checks = computed(() =>
  props.session ? sessionChecks(props.session) : null,
);
const submitEnabled = computed(
  () => props.session && !props.hasUnsaved && canSubmitSession(props.session),
);
const submitTip = computed(() =>
  props.hasUnsaved
    ? "Save your file changes before submitting for review"
    : !props.session?.canManage
      ? "This account cannot submit this session"
      : !submitEnabled.value
        ? "Checks must pass before submitting for review"
        : `Move draft PR #${props.session.number} into review`,
);
let resizeObserver;
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    wide.value = entry.contentRect.width >= 560;
  });
  resizeObserver.observe(header.value);
});
onUnmounted(() => {
  disposed = true;
  resizeObserver?.disconnect();
  window.clearTimeout(copyTimer);
});
</script>

<template>
  <header
    ref="header"
    aria-label="Session navigation"
    class="sticky top-0 z-20 flex min-h-[61px] shrink-0 items-center gap-3 border-b border-border-soft bg-bg py-2.5 pr-4 pl-5"
  >
    <button
      type="button"
      aria-label="Open sidebar"
      aria-controls="global-navigation"
      :aria-expanded="sidebar.open.value"
      class="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-[10px] hover:bg-hover workspace:hidden"
      @click="sidebar.openMethod"
    >
      <SessionIcon name="menu" class="size-5" />
    </button>
    <template v-if="session">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <div class="flex min-w-0 items-center gap-2">
          <h1
            :title="session.title"
            class="min-w-[40px] flex-[0_1_auto] truncate text-sm leading-[22px] font-semibold"
          >
            {{ session.title }}
          </h1>
          <span
            :class="status.color"
            class="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[11px] bg-current/7 pr-[9px] pl-[7px] text-meta leading-none font-medium whitespace-nowrap ring-1 ring-border-soft/55 ring-inset"
            ><SessionIcon :name="status.icon" class="size-[13px]" />{{
              status.label
            }}</span
          >
          <a
            v-if="checks"
            :href="
              session.provider === 'github'
                ? `${session.url}/checks`
                : session.url
            "
            target="_blank"
            rel="noopener noreferrer"
            :title="checks.label"
            :aria-label="checks.label"
            :class="checks.color"
            class="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[11px] bg-current/7 pr-[9px] pl-[7px] text-meta leading-none font-medium whitespace-nowrap ring-1 ring-border-soft/55 ring-inset hover:brightness-90"
            ><SessionIcon :name="checks.icon" class="size-[13px]" /><span
              :class="!wide ? 'sr-only' : ''"
              >{{ checks.label }}</span
            ></a
          >
        </div>
        <div
          class="flex items-center gap-1.5 overflow-hidden text-xs leading-[17px] whitespace-nowrap text-muted"
        >
          <SessionIcon name="repo" class="size-[13px]" />
          <span
            :title="`${session.owner}/${session.repo}`"
            class="min-w-[40px] flex-[0_1_auto] truncate"
            >{{ session.owner }}/{{ session.repo }}</span
          >
          <span aria-hidden="true" class="shrink-0">·</span>
          <a
            :href="session.url"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 hover:text-primary hover:underline"
            >PR #{{ session.number }}</a
          >
          <span aria-hidden="true" class="shrink-0">·</span>
          <span
            :title="session.branch"
            class="min-w-[40px] flex-[0_1_auto] truncate font-mono text-meta"
            >{{ session.branch }}</span
          >
          <button
            type="button"
            :aria-label="copyState || 'Copy branch name'"
            :title="copyState || 'Copy branch name'"
            :disabled="!session.branch || copying"
            :class="
              copyState === 'Copied'
                ? 'text-open'
                : copyState
                  ? 'text-closed'
                  : 'text-muted'
            "
            class="flex size-5 shrink-0 items-center justify-center rounded hover:bg-hover disabled:opacity-40"
            @click="copyBranchMethod"
          >
            <SessionIcon
              :name="
                copyState === 'Copied'
                  ? 'check-circle'
                  : copyState
                    ? 'alert'
                    : 'copy'
              "
              class="size-[13px]"
            />
          </button>
        </div>
      </div>
      <div
        v-if="showViewSwitch && onMobileView"
        role="group"
        aria-label="Workspace view"
        class="flex shrink-0 gap-0.5 rounded-[10px] bg-hover p-[3px]"
      >
        <button
          :aria-pressed="mobileView === 'chat'"
          type="button"
          :class="
            mobileView === 'chat'
              ? 'bg-elev text-text shadow-sm'
              : 'text-muted hover:text-text'
          "
          class="h-[34px] rounded-lg px-3 text-[12.5px] font-medium"
          @click="onMobileView('chat')"
        >
          Chat
        </button>
        <button
          :aria-pressed="mobileView === 'files'"
          type="button"
          :class="
            mobileView === 'files'
              ? 'bg-elev text-text shadow-sm'
              : 'text-muted hover:text-text'
          "
          class="h-[34px] rounded-lg px-3 text-[12.5px] font-medium"
          @click="onMobileView('files')"
        >
          Files
        </button>
      </div>
      <button
        v-if="session.status === 'draft' && session.changedFiles > 0"
        type="button"
        aria-label="Submit for review"
        :title="submitTip"
        :disabled="!submitEnabled"
        class="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-[9px] text-[12.5px] font-semibold whitespace-nowrap text-on-primary disabled:cursor-default disabled:bg-hover disabled:text-muted workspace:h-8"
        :class="wide ? 'px-3.5' : ''"
        @click="action = 'review'"
      >
        <SessionIcon name="pr-open" class="size-[15px]" /><span v-if="wide"
          >Submit for review</span
        >
      </button>
      <SessionOptions
        :session="session"
        :on-action="(value) => (action = value)"
      />
      <SessionActionDialog
        v-if="action"
        :session="session"
        :action="action"
        :on-close="() => (action = '')"
        :on-updated="onUpdated"
      />
    </template>
    <p v-else-if="failed" class="flex-1 text-ui text-muted">
      Session unavailable
    </p>
    <div
      v-else
      role="status"
      class="flex min-w-0 flex-1 flex-col gap-2 py-1 motion-safe:animate-pulse"
    >
      <span class="sr-only">Loading session…</span
      ><span
        aria-hidden="true"
        class="h-3.5 w-2/5 rounded bg-border-soft"
      ></span
      ><span
        aria-hidden="true"
        class="h-2.5 w-3/5 rounded bg-border-soft"
      ></span>
    </div>
  </header>
</template>
