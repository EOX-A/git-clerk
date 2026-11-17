<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import useSessionsStore from "@/stores/sessions.js";
import { SESSION_STATUS } from "@/helpers/session-status.js";
import { SESSION_SORT_OPTIONS } from "@/helpers/session-filters.js";
import NavIcon from "@/components/nav/NavIcon.vue";
import useScrollbar from "@/helpers/use-scrollbar.js";

const props = defineProps({ visible: { type: Boolean, default: true } });
const sessionsStore = useSessionsStore();
const {
  statuses,
  sort,
  filterSummary,
  filtersActive,
  statusCounts,
  allLoaded,
  loading,
  error,
} = storeToRefs(sessionsStore);
const open = ref(false);
const { isScrolling, scrollMethod } = useScrollbar();
const filterArea = ref(null);
const trigger = ref(null);
const panel = ref(null);
const position = ref({ left: "8px", top: "8px" });
let resizeObserver;

const positionPanelMethod = () => {
  if (!open.value || !panel.value) return;
  const bounds = trigger.value.getBoundingClientRect();
  const panelBounds = panel.value.getBoundingClientRect();
  position.value = {
    left: `${Math.max(8, Math.min(bounds.left - 8, window.innerWidth - panelBounds.width - 8))}px`,
    top: `${Math.max(8, Math.min(bounds.bottom + 6, window.innerHeight - panelBounds.height - 8))}px`,
  };
};

const closeMethod = (restoreFocus = false) => {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
};

const toggleMethod = async () => {
  if (open.value) return closeMethod(true);
  open.value = true;
  // Counts and sorting must include fresh matching sessions from every GitHub page.
  sessionsStore.loadSessions(false, true, true);
  await nextTick();
  positionPanelMethod();
  panel.value?.querySelector("button")?.focus();
};

const outsideMethod = (event) => {
  if (!filterArea.value?.contains(event.target)) closeMethod();
};

const blurMethod = (event) => {
  if (event.relatedTarget && !filterArea.value?.contains(event.relatedTarget))
    closeMethod();
};

const clearMethod = async () => {
  sessionsStore.clearFilters();
  await nextTick();
  trigger.value?.focus();
};

watch(
  () => props.visible,
  (visible) => {
    if (!visible) closeMethod();
  },
);

onMounted(() => {
  if (!allLoaded.value && !loading.value) {
    sessionsStore.loadSessions(false, true);
  }
  document.addEventListener("pointerdown", outsideMethod);
  window.addEventListener("resize", positionPanelMethod);
  resizeObserver = new ResizeObserver(positionPanelMethod);
  resizeObserver.observe(filterArea.value);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", outsideMethod);
  window.removeEventListener("resize", positionPanelMethod);
  resizeObserver?.disconnect();
});
</script>

<template>
  <div ref="filterArea" class="shrink-0" @focusout="blurMethod">
    <div class="flex items-center gap-1 pt-2.5 pr-2 pb-1 pl-[18px]">
      <h2 class="flex-1 text-meta font-medium text-muted">Sessions</h2>
      <button
        ref="trigger"
        type="button"
        aria-label="Filter and sort sessions"
        title="Filter and sort"
        aria-haspopup="dialog"
        aria-controls="session-filter-panel"
        :aria-expanded="open"
        :class="open || filtersActive ? 'bg-hover text-text' : 'text-muted'"
        class="relative flex size-11 items-center justify-center rounded-[7px] hover:bg-hover hover:text-text workspace:size-7"
        @click="toggleMethod"
        @keydown.down.prevent="!open && toggleMethod()"
        @keydown.up.prevent="!open && toggleMethod()"
      >
        <NavIcon name="sliders" class="size-4" />
        <span
          v-if="filtersActive"
          aria-hidden="true"
          class="absolute top-1 right-1 size-1.5 rounded-full bg-primary ring-2 ring-sidebar"
        ></span>
      </button>
    </div>

    <div v-if="filtersActive" class="px-2 pt-0.5 pb-1.5">
      <div
        class="flex min-h-7 items-center gap-1.5 rounded-lg bg-elev pr-[3px] pl-2.5 ring-1 ring-border-soft"
      >
        <span
          :title="filterSummary"
          class="min-w-0 flex-1 truncate text-meta font-medium"
          >{{ filterSummary }}</span
        >
        <button
          type="button"
          aria-label="Clear filters and sorting"
          title="Clear filters"
          class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-text workspace:size-[22px]"
          @click="clearMethod"
        >
          <NavIcon name="x" class="size-[13px]" />
        </button>
      </div>
    </div>

    <div
      v-if="open"
      id="session-filter-panel"
      ref="panel"
      role="dialog"
      aria-label="Filter and sort sessions"
      :style="position"
      :data-scrolling="isScrolling"
      class="nav-scrollbar fixed z-50 flex max-h-[calc(100dvh-16px)] w-[264px] max-w-[calc(100vw-16px)] flex-col gap-3.5 overflow-y-auto rounded-xl border border-border-soft bg-elev p-3 shadow-menu"
      @scroll.passive="scrollMethod"
      @keydown.esc.stop.prevent="closeMethod(true)"
    >
      <div>
        <h3
          id="session-status-label"
          class="mb-2 text-meta font-semibold text-muted"
        >
          Status
        </h3>
        <div
          role="group"
          aria-labelledby="session-status-label"
          class="grid grid-cols-2 gap-1.5"
        >
          <button
            v-for="(status, value) in SESSION_STATUS"
            :key="value"
            type="button"
            :aria-label="status.label"
            :aria-pressed="statuses.includes(value)"
            :class="
              statuses.includes(value)
                ? 'bg-hover font-semibold text-text'
                : 'font-medium text-muted'
            "
            class="flex h-11 items-center gap-1.5 rounded-2xl pr-1.5 pl-2.5 text-[12.5px] hover:bg-hover workspace:h-8"
            @click="sessionsStore.toggleStatus(value)"
          >
            <NavIcon
              :name="status.icon"
              :class="statuses.includes(value) ? status.color : 'text-muted'"
              class="size-3.5"
            />
            <span class="flex-1 text-left">{{ status.label }}</span>
            <span
              :class="statuses.includes(value) ? 'bg-elev' : ''"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
              >{{ allLoaded ? statusCounts[value] : "…" }}</span
            >
          </button>
        </div>
      </div>

      <fieldset>
        <legend class="mb-1.5 text-meta font-semibold text-muted">
          Sort by
        </legend>
        <div class="-mx-1.5 flex flex-col gap-px">
          <label
            v-for="option in SESSION_SORT_OPTIONS"
            :key="option.value"
            class="relative cursor-pointer"
          >
            <input
              type="radio"
              name="session-sort"
              :value="option.value"
              :checked="sort === option.value"
              class="peer sr-only"
              @change="sessionsStore.setSort(option.value)"
            />
            <span
              class="flex h-11 items-center gap-2 rounded-[7px] px-2 text-[12.5px] hover:bg-hover peer-checked:bg-hover peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary workspace:h-[30px]"
            >
              <span class="flex-1">{{ option.label }}</span>
              <NavIcon
                v-if="sort === option.value"
                name="check"
                class="size-[15px] text-primary"
              />
            </span>
          </label>
        </div>
      </fieldset>

      <!-- Grouping is deferred until organization support is available. -->
      <p v-if="!allLoaded" role="status" class="text-meta text-muted">
        {{
          loading
            ? "Loading all sessions for filtering…"
            : error
              ? "Could not load all sessions. Retry in the list below."
              : "Session counts are not available yet."
        }}
      </p>
    </div>
  </div>
</template>
