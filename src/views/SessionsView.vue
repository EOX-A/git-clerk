<script setup>
import OctIcon from "@/components/global/OctIcon.vue";
import { h, inject, onMounted, ref } from "vue";
import {
  deleteBySessionNumber,
  getSessionsList,
  reviewBySessionNumber,
  createSessionByName,
} from "@/api/index.js";
import {
  querySessionsListMethod,
  checkStatusMethod,
} from "@/methods/sessions-view";
import { useRoute, useRouter } from "vue-router";
import Tooltip from "@/components/global/Tooltip.vue";
import { useLoader } from "@/helpers/index.js";
import { DeleteSession } from "@/components/session";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";

const route = useRoute();
const router = useRouter();

const sessions = ref(null);
const totalPage = ref(0);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);
const deleteSession = ref(false);
const reviewSession = ref(false);
const createNewSession = ref(false);
const newSessionName = ref("");
const loader = ref({});

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const updateSessionsList = async (cache = false) => {
  sessions.value = null;
  window.scrollTo({ top: 0 });
  const sessionsList = await getSessionsList(page.value, cache);
  querySessionsListMethod(sessionsList, { snackbar, sessions, totalPage });
  checkStatusMethod(sessions, sessionsList.curr, page);
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

const onKeyEnterCreateNewSession = async (event) => {
  if (event.key === "Escape") clearInputCreateNewSession();
  else if (event.key === "Enter") {
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
      setTimeout(() => router.push(`/${snackbar.value.number}`), 750);
      clearInputCreateNewSession();
    }
  }
};

onMounted(async () => {
  navButtonConfig.value = {
    text: "Create New Session",
    icon: "mdi-source-pull",
    click: createNewSessionClick,
  };
  navPaginationItems.value = [navPaginationItems.value[0]];
  await updateSessionsList(true);
});

const onPageChange = async (newPage) => {
  page.value = newPage;
  await router.push({ query: { ...route.query, page: newPage } });
  await updateSessionsList(true);
};

const reviewSessionHandle = async () => {
  if (reviewSession.value) {
    loader.value = useLoader().show();
    snackbar.value = await reviewBySessionNumber(
      reviewSession.value.number,
      reviewSession.value.node_id,
    );
    reviewSession.value = false;
    loader.value.hide();
    await updateSessionsList();
  }
};
</script>

<template>
  <div v-if="createNewSession" class="d-flex justify-center bg-white">
    <v-row>
      <v-col cols="12">
        <!-- Custom styled text field -->
        <v-text-field
          v-model="newSessionName"
          label="Session Name"
          placeholder="Enter a session name"
          hide-details
          append-inner-icon="mdi-close"
          @click:append-inner="clearInputCreateNewSession"
          @keydown="onKeyEnterCreateNewSession"
          variant="outlined"
          class="session-create-field px-6 py-6 border-b-thin"
        />
      </v-col>
    </v-row>
  </div>

  <v-list class="py-0">
    <!-- Session's list -->
    <v-list-item
      v-if="sessions && sessions.length"
      v-for="session in sessions"
      :key="session.title"
      :title="session.title"
      :class="`sessions-view py-4 border-b-thin ${session.state === 'closed' && 'session-closed'}`"
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
                v-if="session.check === 'failed'"
                text="Validation Failed"
              >
                <v-icon color="red" size="23" icon="mdi-alert-outline"></v-icon>
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
              <span>Changes made on: </span>
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
        <Tooltip text="Open in Github">
          <v-btn
            :href="session.html_url"
            target="_blank"
            color="blue-grey-darken-4"
            icon="mdi-github"
            size="large"
            variant="text"
          ></v-btn>
        </Tooltip>
        <DeleteSession
          :session="session"
          :snackbar="snackbar"
          :callBack="updateSessionsList"
        />
        <Tooltip text="Checkout Preview">
          <v-btn
            color="blue-grey-darken-4"
            icon="mdi-monitor-eye"
            size="large"
            variant="text"
          ></v-btn>
        </Tooltip>
        <Tooltip text="Request Review">
          <v-btn
            color="blue-grey-darken-4"
            icon="mdi-file-document-edit"
            size="large"
            variant="text"
            @click="reviewSession = session"
            :disabled="!session.draft || session.state === 'closed'"
          ></v-btn>
        </Tooltip>
      </template>
    </v-list-item>

    <!-- Placeholder for session's list -->
    <ListPlaceholder v-else-if="sessions === null" />

    <v-empty-state
      v-else
      headline="Whoops, No sessions found."
      icon="mdi-source-pull"
      class="my-16 py-16"
    >
      <template v-slot:text>
        To get started, you should
        <a
          @click="createNewSessionClick"
          class="text-blue-accent-4 font-weight-medium"
          href="#"
          >create new session</a
        >
      </template>
    </v-empty-state>
  </v-list>

  <div class="text-center border-t-thin py-6 bg-background">
    <v-pagination
      v-if="sessions"
      v-model="page"
      :length="totalPage"
      @update:model-value="onPageChange"
      density="comfortable"
      total-visible="6"
      color="primary"
      next-icon="mdi-menu-right"
      prev-icon="mdi-menu-left"
    ></v-pagination>
  </div>

  <v-dialog v-model="reviewSession" width="auto">
    <v-card
      max-width="400"
      prepend-icon="mdi-alert"
      title="Request Review Session"
    >
      <template v-slot:text>
        Are you sure you want to request this session for review:
        <strong>{{ reviewSession.title }}</strong>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn @click="reviewSession = false"> Cancel </v-btn>
        <v-btn color="success" variant="flat" @click="reviewSessionHandle">
          Request
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<style>
.sessions-view.session-closed {
  background: #f5f5f5;
  opacity: 0.4;
}

.sessions-view.session-closed:hover {
  background: white;
  opacity: 1;
}

.sessions-view .octicon-file-diff {
  width: 20px;
  height: 20px;
}

.sessions-view .file-diff span {
  line-height: 0.5;
}

.session-create-field {
  border-bottom: 1px solid #647078;
}

.session-create-field .v-label {
  color: #6c757d;
}

.session-create-field .v-field__input {
  padding-top: 10px;
  padding-bottom: 10px;
  color: #000000;
}

.session-create-field .v-field__append-inner .v-icon {
  color: #6c757d;
  cursor: pointer;
}

.session-create-field.v-text-field--outline {
  background-color: white;
  border-color: #d9d9d9;
  box-shadow: none;
}

.session-create-field .v-field__outline {
  border-color: transparent;
}
</style>
