<script setup>
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import useSessionsStore from "@/stores/sessions.js";
import { SESSION_STATUS } from "@/helpers/session-status.js";
import NavIcon from "@/components/nav/NavIcon.vue";
import SessionListPlaceholder from "@/components/nav/SessionListPlaceholder.vue";
import { SessionActionDialog, SessionOptions } from "@/components/session";
import useScrollbar from "@/helpers/use-scrollbar.js";

defineProps({ onSelectSession: { type: Function, required: true } });

const route = useRoute();
const { isScrolling, scrollMethod } = useScrollbar();
const sessionsStore = useSessionsStore();
const {
  sessions,
  visibleSessions,
  sessionGroups,
  group,
  collapsedGroups,
  filtersActive,
  allLoaded,
  loading,
  error,
  pageInfo,
} = storeToRefs(sessionsStore);
const actionSession = ref(null);
const action = ref("");

const openActionMethod = (session, value) => {
  actionSession.value = session;
  action.value = value;
};
const closeActionMethod = () => {
  actionSession.value = null;
  action.value = "";
};
const updatedSessionMethod = async () => {
  if (!actionSession.value) return;
  try {
    actionSession.value = await sessionsStore.getSession(
      actionSession.value.number,
    );
  } catch {
    /* Ignore refresh errors; the store keeps existing row data. */
  }
};
</script>

<template>
  <div
    role="region"
    aria-label="Session list"
    tabindex="0"
    class="nav-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2"
    :aria-busy="loading"
    :data-scrolling="isScrolling"
    @scroll.passive="scrollMethod"
  >
    <p
      v-if="!loading && !error && !visibleSessions.length"
      class="px-2.5 py-3.5 text-ui text-muted"
    >
      {{
        filtersActive ? "No sessions match these filters." : "No sessions yet."
      }}
    </p>
    <div v-for="(sessionGroup, index) in sessionGroups" :key="sessionGroup.id">
      <button
        v-if="group !== 'none'"
        type="button"
        :aria-expanded="!collapsedGroups.has(sessionGroup.id)"
        :aria-controls="`session-group-${index}`"
        :title="sessionGroup.title"
        class="mt-1.5 flex min-h-7 w-full items-center gap-1.5 rounded-md pr-2.5 pl-1.5 text-meta font-semibold text-muted hover:bg-hover hover:text-text"
        @click="sessionsStore.toggleGroup(sessionGroup.id)"
      >
        <NavIcon
          :name="
            collapsedGroups.has(sessionGroup.id) ? 'chev-right' : 'chev-down'
          "
          class="size-[13px]"
        />
        <NavIcon :name="group === 'org' ? 'org' : 'repo'" class="size-[13px]" />
        <span class="min-w-0 flex-1 truncate text-left">{{
          sessionGroup.label
        }}</span>
        <span class="font-medium">{{ sessionGroup.sessions.length }}</span>
      </button>
      <ul
        :id="`session-group-${index}`"
        v-show="group === 'none' || !collapsedGroups.has(sessionGroup.id)"
        class="space-y-px"
      >
        <li
          v-for="session in sessionGroup.sessions"
          :key="session.id"
          :data-selected="Number(route.params.sessionNumber) === session.number"
          class="group/row relative"
        >
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
            class="flex min-h-11 w-full items-start gap-2.5 rounded-lg py-2 pr-9 pl-2.5 text-left"
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
                >#{{ session.number }} ·
                {{
                  group === "repo"
                    ? SESSION_STATUS[session.status].label
                    : session.repo
                }}</span
              >
            </span>
          </button>
          <div class="absolute top-2.5 right-1.5">
            <SessionOptions
              :session="session"
              compact
              :label="`More options for ${session.title}`"
              :on-action="(value) => openActionMethod(session, value)"
            />
          </div>
        </li>
      </ul>
    </div>
    <SessionActionDialog
      v-if="action && actionSession"
      :session="actionSession"
      :action="action"
      :on-close="closeActionMethod"
      :on-updated="updatedSessionMethod"
    />
    <div v-if="loading && !allLoaded" role="status">
      <span class="sr-only">{{
        filtersActive
          ? "Loading sessions for these filters…"
          : sessions.length
            ? "Loading more sessions…"
            : "Loading sessions…"
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
