<script setup>
import OctIcon from "@/components/global/OctIcon.vue";
import { inject, onMounted, ref } from "vue";
import {
  getSessionsList,
  searchSessionName,
  getNumberOfOpenClosedSessions,
  syncRepo,
} from "@/api/index.js";
import {
  querySessionsListMethod,
  checkStatusMethod,
} from "@/methods/sessions-view";
import { useRoute, useRouter } from "vue-router";
import Tooltip from "@/components/global/Tooltip.vue";
import {
  preventListItemClick,
  createSession,
  postSessionCreation,
} from "@/helpers/index.js";
import {
  ActionList,
  ActionTabSessions,
  CreateSession,
  WelcomeSection,
} from "@/components/session";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import CursorPagination from "@/components/global/CursorPagination.vue";
import { FileBrowserDrawer } from "@/components/file-browser";
import find from "lodash.find";

const route = useRoute();
const router = useRouter();

const sessions = ref(null);
const pageInfo = ref(null);
const hover = ref(null);
const cursorPosition = ref(null);
const sessionSelectedState = ref("open");
const numberOfOpenClosedSessions = ref(null);
const createNewSession = ref(false);
const newSessionName = ref("");
const loader = ref({});
const currentPage = ref(1);
const cursorHistory = ref([]);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const updateSessionsList = async (cache = false) => {
  sessions.value = null;
  window.scrollTo({ top: 0 });
  syncRepo();
  const sessionsList = await getSessionsList(
    pageInfo.value,
    cursorPosition.value,
    sessionSelectedState.value,
    cache,
  );

  if (sessionsList.pageInfo) {
    const { startCursor, endCursor, hasNextPage } = sessionsList.pageInfo;

    if (!pageInfo.value) {
      cursorHistory.value.push(startCursor, endCursor);
    } else if (!cursorHistory.value.includes(endCursor) && hasNextPage) {
      cursorHistory.value.push(endCursor);
    }
  }

  cursorPosition.value = null;
  numberOfOpenClosedSessions.value = await getNumberOfOpenClosedSessions(cache);
  const currSessionState = sessionSelectedState.value;
  querySessionsListMethod(sessionsList, { snackbar, sessions, pageInfo });
  const currPath = route.path;
  checkStatusMethod(
    sessions,
    sessionsList.pageInfo,
    pageInfo,
    currSessionState,
    sessionSelectedState,
    currPath,
    route,
  );
};

const createNewSessionClick = () => {
  navButtonConfig.value.disabled = true;
  window.scrollTo({ top: 0 });
  createNewSession.value = true;
  newSessionName.value = "";
};

const clearInputCreateNewSession = () => {
  navButtonConfig.value.disabled = false;
  createNewSession.value = false;
  newSessionName.value = "";
};

onMounted(async () => {
  navButtonConfig.value = {
    text: "Start New Session",
    icon: "mdi-source-pull",
    click: createNewSessionClick,
  };
  navPaginationItems.value = [navPaginationItems.value[0]];

  if (
    (route.query.session || route.query.sessionNumber) &&
    route.query.automation
  ) {
    const sessionNumber = route.query.sessionNumber;
    newSessionName.value = route.query.session;

    let sessionFound = null;

    if (sessionNumber) {
      sessionFound = { number: sessionNumber };
    } else if (newSessionName.value) {
      const sessionsList = await searchSessionName(
        newSessionName.value,
        null,
        null,
        "open",
      );
      const sessionsData = sessionsList?.data || [];
      sessionFound = find(sessionsData, { title: newSessionName.value });
    }
    if (sessionFound) {
      postSessionCreation(
        sessionFound.number,
        router,
        route,
        clearInputCreateNewSession,
      );
    } else {
      const props = {
        newSessionName,
        snackbar,
        loader,
      };
      await createSession(props, router, route, clearInputCreateNewSession);
    }
  }
  await updateSessionsList(true);
});

const onPageChange = async (newCursor) => {
  switch (newCursor) {
    case "startCursor":
      cursorPosition.value = newCursor;
      currentPage.value--;
      break;
    case "endCursor":
      cursorPosition.value = newCursor;
      currentPage.value++;
      break;
    default:
      cursorPosition.value =
        newCursor === 1 ? null : cursorHistory.value[newCursor - 1];
      currentPage.value = newCursor;
  }
  await updateSessionsList(true);
};

const changeSessionState = async (newState) => {
  if (sessionSelectedState.value !== newState) {
    sessionSelectedState.value = newState;
    await resetWholeState();
  }
};

const resetWholeState = async () => {
  cursorHistory.value = []; // Reset cursor history when changing state
  currentPage.value = 1;
  pageInfo.value = null;
  await updateSessionsList(true);
};
</script>

<template>
  <FileBrowserDrawer />
  <CreateSession
    v-if="createNewSession"
    :create-new-session="createNewSession"
    :clear-input="clearInputCreateNewSession"
  />

  <ActionTabSessions
    v-if="
      numberOfOpenClosedSessions &&
      (numberOfOpenClosedSessions.open || numberOfOpenClosedSessions.closed)
    "
    :session-selected-state="sessionSelectedState"
    :change-session-state="changeSessionState"
    :number-of-open-closed-sessions="numberOfOpenClosedSessions"
    :sessions="sessions"
  />

  <v-list class="py-0">
    <template v-if="sessions && sessions.length">
      <!-- Session's list -->
      <v-list-item
        v-for="(session, index) in sessions"
        :key="session.title"
        :title="session.title"
        class="sessions-view bg-white py-4 border-b-thin"
        :to="`/${session.number}`"
        @mouseenter="hover = index"
        @mouseleave="hover = null"
        @click.native.capture="preventListItemClick"
      >
        <template #title>
          <div class="d-flex align-start px-5">
            <v-icon :color="session.status.color" class="pr-icon opacity-100">
              <OctIcon :name="session.status.icon" />
            </v-icon>
            <div class="ml-4">
              <div class="d-flex align-center ga-3">
                <div
                  class="main-title session-title text-black"
                  :class="{ 'font-weight-bold': hover === index }"
                >
                  {{ session.title }}
                </div>
                <Tooltip
                  v-if="session.check && !session.check.success"
                  location="right"
                  :text="session.check.tooltip"
                >
                  <v-icon
                    :color="session.check.color"
                    size="23"
                    :icon="session.check.icon"
                  ></v-icon>
                </Tooltip>
                <Tooltip
                  v-if="session.requested_changes"
                  location="right"
                  text="Requested Changes"
                >
                  <v-icon color="red" class="file-diff">
                    <OctIcon name="file-diff" />
                  </v-icon>
                </Tooltip>
              </div>
              <div class="v-list-item-subtitle d-flex align-center pt-2 ga-3">
                <span class="d-none d-sm-flex">Changes made on: </span>
                <div class="d-flex align-center">
                  <v-icon>mdi-calendar-blank-outline</v-icon>
                  <span class="text-black px-1">{{ session.date }}</span>
                </div>
                <div class="d-flex align-center">
                  <v-icon>mdi-clock-time-five-outline</v-icon>
                  <span class="text-black px-1">{{ session.time }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #append>
          <ActionList :session="session" :call-back="resetWholeState" />
        </template>
      </v-list-item>
    </template>

    <!-- Placeholder for session's list -->
    <ListPlaceholder v-else-if="sessions === null" :button="3" />

    <WelcomeSection v-else :create-new-session-click="createNewSessionClick" />
  </v-list>

  <CursorPagination
    v-if="sessions && sessions.length"
    :page-info="pageInfo"
    :on-page-change="onPageChange"
    :current-page="currentPage"
    :cursor-history="cursorHistory"
  />
</template>
