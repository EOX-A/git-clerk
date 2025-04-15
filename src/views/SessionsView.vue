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
import { useLoader } from "@/helpers/index.js";
import { ActionList, ActionTabSessions } from "@/components/session";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import ListPagination from "@/components/global/ListPagination.vue";
import EmptyState from "@/components/global/EmptyState.vue";
import { BASE_PATH } from "@/enums";

const route = useRoute();
const router = useRouter();

const sessions = ref(null);
const totalPage = ref(0);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);
const deleteSession = ref(false);
const reviewSession = ref(false);
const sessionSelectedState = ref("open");
const numberOfOpenClosedSessions = ref(null);
const createNewSession = ref(false);
const newSessionName = ref("");
const loader = ref({});

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const updateSessionsList = async (cache = false) => {
  sessions.value = null;
  window.scrollTo({ top: 0 });
  const sessionsList = await getSessionsList(
    page.value,
    sessionSelectedState.value,
    cache,
  );
  numberOfOpenClosedSessions.value = await getNumberOfOpenClosedSessions(cache);
  const currSessionState = sessionSelectedState.value;
  querySessionsListMethod(sessionsList, { snackbar, sessions, totalPage });
  checkStatusMethod(
    sessions,
    sessionsList.curr,
    page,
    currSessionState,
    sessionSelectedState,
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

const createFile = async () => {
  if (!newSessionName.value) {
    snackbar.value = {
      text: "Session name is empty. Please provide a session name.",
      status: "error",
    };
    return;
  }
  loader.value = useLoader().show(
    {},
    {
      after: h(
        "h5",
        { class: "loader-text", id: "loader-text" },
        "Checking fork branch present in your profile...",
      ),
    },
  );
  snackbar.value = await createSessionByName(newSessionName.value);
  loader.value.hide();

  if (snackbar.value.number) {
    const params = Object.fromEntries(
      Object.entries(route.query).filter(([key]) => key !== "session"),
    );
    const queryString = new URLSearchParams(params).toString();
    const url = Boolean(queryString)
      ? `/${snackbar.value.number}?${queryString}`
      : `/${snackbar.value.number}`;
    setTimeout(() => router.push(url), 750);
    clearInputCreateNewSession();
  }
};

const onKeyEnterCreateNewSession = async (event) => {
  if (event.key === "Escape") clearInputCreateNewSession();
  else if (event.key === "Enter") await createFile();
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
    await createFile();
  }
  await updateSessionsList(true);
});

const onPageChange = async (newPage) => {
  page.value = newPage;
  await router.push({ query: { ...route.query, page: newPage } });
  await updateSessionsList(true);
};

const changeSessionState = async (newState) => {
  if (sessionSelectedState.value !== newState) {
    sessionSelectedState.value = newState;
    await updateSessionsList(true);
  }
};
</script>

<template>
  <div v-if="createNewSession" class="d-flex justify-center bg-white">
    <v-row>
      <v-col cols="12" class="d-flex">
        <!-- Custom styled text field -->
        <div
          class="px-6 py-6 border-b-thin session-create-field d-flex w-100 align-center justify-center ga-4"
        >
          <v-text-field
            v-model="newSessionName"
            label="Session Name"
            placeholder="Name your Session..."
            hide-details
            :append-inner-icon="
              newSessionName.length > 0 ? 'mdi-restart' : undefined
            "
            @click:append-inner="newSessionName = ''"
            @keydown="onKeyEnterCreateNewSession"
            variant="outlined"
          />
          <v-btn
            prepend-icon="mdi-plus"
            color="primary"
            size="x-large"
            variant="flat"
            @click="createFile"
          >
            Create
          </v-btn>
          <v-btn
            variant="text"
            icon="mdi-close"
            @click="clearInputCreateNewSession"
          ></v-btn>
        </div>
      </v-col>
    </v-row>
  </div>

  <ActionTabSessions
    :sessionSelectedState="sessionSelectedState"
    :changeSessionState="changeSessionState"
    :numberOfOpenClosedSessions="numberOfOpenClosedSessions"
  />

  <v-list class="py-0">
    <!-- Session's list -->
    <v-list-item
      v-if="sessions && sessions.length"
      v-for="session in sessions"
      :key="session.title"
      :title="session.title"
      :class="`sessions-view bg-white py-4 border-b-thin`"
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-icon :color="session.status.color" class="pr-icon opacity-100">
            <OctIcon :name="session.status.icon" />
          </v-icon>
          <div class="ml-4">
            <div class="d-flex align-center ga-3">
              <router-link
                :to="`/${session.number}`"
                class="main-title text-black"
              >
                {{ session.title }}
              </router-link>
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
        <ActionList :session="session" :callBack="updateSessionsList" />
      </template>
    </v-list-item>

    <!-- Placeholder for session's list -->
    <ListPlaceholder :button="3" v-else-if="sessions === null" />

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

  <ListPagination v-if="sessions" :page :totalPage :onPageChange />
</template>
