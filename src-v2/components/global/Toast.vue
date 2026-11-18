<script setup>
import { inject, onUnmounted, watch } from "vue";

const snackbar = inject("set-snackbar");
let timer;
const pauseMethod = () => window.clearTimeout(timer);
const closeMethod = () => {
  pauseMethod();
  snackbar.value = false;
};
const resumeMethod = () => {
  pauseMethod();
  if (snackbar.value) timer = window.setTimeout(closeMethod, 3500);
};
watch(snackbar, resumeMethod);
onUnmounted(pauseMethod);
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="pointer-events-none fixed right-4 bottom-[max(24px,env(safe-area-inset-bottom))] left-4 z-[70] sm:right-6 sm:left-auto sm:w-[360px]"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="snackbar"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border border-border-soft bg-elev p-3.5 shadow-floating"
        @mouseenter="pauseMethod"
        @mouseleave="resumeMethod"
        @focusin="pauseMethod"
        @focusout="resumeMethod"
      >
        <span
          :class="
            snackbar.status === 'error'
              ? 'bg-closed/10 text-closed'
              : 'bg-open/10 text-open'
          "
          class="flex size-8 shrink-0 items-center justify-center rounded-full"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="size-[18px]"
          >
            <circle cx="12" cy="12" r="9" />
            <path v-if="snackbar.status === 'error'" d="M12 7v6m0 4h.01" />
            <path v-else d="m8 12 2.5 2.5L16 9" />
          </svg>
        </span>
        <div class="min-w-0 flex-1 self-center">
          <p class="text-ui font-semibold text-text">{{ snackbar.text }}</p>
          <p
            v-if="snackbar.description"
            :title="snackbar.description"
            class="mt-0.5 truncate font-mono text-meta text-muted"
          >
            {{ snackbar.description }}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          title="Dismiss"
          class="-mt-0.5 -mr-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-text"
          @click="closeMethod"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            aria-hidden="true"
            class="size-4"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>
