<script setup>
import OctIcon from "@/components/global/OctIcon.vue";
import { h, inject, onMounted, ref } from "vue";
import {
  getSessionsList,
  createSessionByName,
  getNumberOfOpenClosedSessions,
} from "@/api/index.js";
import {
  querySessionsListMethod,
  checkStatusMethod,
} from "@/methods/sessions-view";
import { useRoute, useRouter } from "vue-router";
import Tooltip from "@/components/global/Tooltip.vue";
import {
  useLoader,
  preventListItemClick,
  createSession,
} from "@/helpers/index.js";
import {
  ActionList,
  ActionTabSessions,
  CreateSession,
} from "@/components/session";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import CursorPagination from "@/components/global/CursorPagination.vue";
import EmptyState from "@/components/global/EmptyState.vue";
import { BASE_PATH } from "@/enums";
import { FileBrowserDrawer } from "@/components/file-browser";

const route = useRoute();
const router = useRouter();

const sessions = ref(null);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);
const pageInfo = ref(null);
const hover = ref(null);
const cursorPosition = ref(null);
const deleteSession = ref(false);
const reviewSession = ref(false);
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

  if (route.query.session && route.query.automation) {
    newSessionName.value = route.query.session;
    await createSession(
      {
        newSessionName,
        snackbar,
        loader,
      },
      router,
      route,
      clearInputCreateNewSession,
    );
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
    :createNewSession="createNewSession"
    :clearInput="clearInputCreateNewSession"
  />

  <ActionTabSessions
    :sessionSelectedState="sessionSelectedState"
    :changeSessionState="changeSessionState"
    :numberOfOpenClosedSessions="numberOfOpenClosedSessions"
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
        @mouseenter="hover = index"
        @mouseleave="hover = null"
        :to="`/${session.number}`"
        @click.native.capture="preventListItemClick"
      >
        <template v-slot:title>
          <div class="d-flex align-start px-5">
            <v-icon :color="session.status.color" class="pr-icon opacity-100">
              <OctIcon :name="session.status.icon" />
            </v-icon>
            <div class="ml-4">
              <div class="d-flex align-center ga-3">
                <div
                  class="main-title text-black"
                  :class="{ 'font-weight-bold': hover === index }"
                >
                  {{ session.title }}
                </div>
                <Tooltip
                  location="right"
                  v-if="session.check && !session.check.success"
                  :text="session.check.tooltip"
                >
                  <v-icon
                    :color="session.check.color"
                    size="23"
                    :icon="session.check.icon"
                  ></v-icon>
                </Tooltip>
                <Tooltip
                  location="right"
                  v-if="session.requested_changes"
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

        <template v-slot:append>
          <ActionList :session="session" :callBack="resetWholeState" />
        </template>
      </v-list-item>
    </template>

    <!-- Placeholder for session's list -->
    <ListPlaceholder v-else-if="sessions === null" :button="3" />

    <EmptyState
      v-else
      headline="No session started yet"
      icon="mdi-source-pull"
      :img="`${BASE_PATH}img/session.svg`"
      btn-text="Start New Session"
      description="Start a new session to share your ideas and propose updates."
      :init-func="createNewSessionClick"
    />
  </v-list>

  <CursorPagination
    v-if="sessions"
    :pageInfo="pageInfo"
    :onPageChange="onPageChange"
    :currentPage="currentPage"
    :cursorHistory="cursorHistory"
  />
</template>
