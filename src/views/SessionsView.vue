<script setup>
import OctIcon from "@/components/global/OctIcon.vue";
import { onMounted, ref } from "vue";
import {
  deleteBySessionNumber,
  getSessionsList,
  reviewBySessionNumber,
} from "@/api/index.js";
import {
  querySessionsListMethod,
  checkStatusMethod,
} from "@/methods/sessions-view";
import { useRoute, useRouter } from "vue-router";
import Tooltip from "@/components/global/Tooltip.vue";

const route = useRoute();
const router = useRouter();

const sessions = ref([]);
const totalPage = ref(0);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);
const deleteSession = ref(false);
const reviewSession = ref(false);
const snackbar = ref(false);

const updateSessionsList = async () => {
  sessions.value = [];
  window.scrollTo({ top: 0 });
  const sessionsList = await getSessionsList(page.value);
  querySessionsListMethod(sessionsList, { snackbar, sessions, totalPage });
  checkStatusMethod(sessions, sessionsList.curr, page);
};

onMounted(async () => {
  await updateSessionsList();
});

const onPageChange = async (newPage) => {
  page.value = newPage;
  await router.push({ query: { ...route.query, page: newPage } });
  await updateSessionsList();
};

const deleteSessionHandle = async () => {
  if (deleteSession.value) {
    snackbar.value = await deleteBySessionNumber(deleteSession.value.number);
    deleteSession.value = false;
    await updateSessionsList();
  }
};

const reviewSessionHandle = async () => {
  if (reviewSession.value) {
    snackbar.value = await reviewBySessionNumber(
      reviewSession.value.number,
      reviewSession.value.node_id,
    );
    reviewSession.value = false;
    await updateSessionsList();
  }
};
</script>

<template>
  <v-list class="py-0">
    <!-- Session's list -->
    <v-list-item
      v-if="sessions.length"
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
                >{{ session.title }}</router-link
              >
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
            <div class="v-list-item-subtitle d-flex align-center pt-2">
              <span>Changes made on: </span>
              <div class="d-flex align-center ml-2">
                <v-icon>mdi-calendar-blank-outline</v-icon>
                <span class="text-black px-1">{{ session.date }}</span>
              </div>
              <div class="d-flex align-center ml-2">
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
        <Tooltip text="Delete Session">
          <v-btn
            color="blue-grey-darken-4"
            icon="mdi-delete-outline"
            size="large"
            variant="text"
            :disabled="session.state === 'closed'"
            @click="deleteSession = session"
          ></v-btn>
        </Tooltip>
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
    <v-list-item
      v-else
      v-for="n in 10"
      :key="n"
      :title="n"
      class="sessions-view py-4 border-b-thin"
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-skeleton-loader type="avatar"></v-skeleton-loader>
          <div class="ml-4">
            <v-skeleton-loader width="300px" type="heading"></v-skeleton-loader>
            <div class="v-list-item-subtitle d-flex align-center pt-2">
              <v-skeleton-loader width="200px" type="text"></v-skeleton-loader>
            </div>
          </div>
        </div>
      </template>
      <template v-slot:append>
        <v-skeleton-loader
          v-for="a in 4"
          :key="a"
          width="24"
          type="heading"
          class="mx-3"
        ></v-skeleton-loader>
      </template>
    </v-list-item>
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

  <v-dialog v-model="deleteSession" width="auto">
    <v-card max-width="400" prepend-icon="mdi-alert" title="Delete Session">
      <template v-slot:text>
        Are you sure you want to delete session:
        <strong>{{ deleteSession.title }}</strong>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn @click="deleteSession = false"> Cancel </v-btn>
        <v-btn color="red" variant="flat" @click="deleteSessionHandle">
          Delete
        </v-btn>
      </template>
    </v-card>
  </v-dialog>

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
        <v-btn color="green" variant="flat" @click="reviewSessionHandle">
          Request
        </v-btn>
      </template>
    </v-card>
  </v-dialog>

  <v-snackbar
    v-model="snackbar"
    timeout="3000"
    :color="snackbar.status"
    :text="snackbar.text"
  >
  </v-snackbar>
</template>

<style>
.sessions-view a.main-title {
  font-weight: 400;
  text-decoration: none;
}
.sessions-view.session-closed {
  border-left: 5px solid #f44336a3;
}
.sessions-view a.main-title:hover {
  font-weight: 500;
  text-decoration: underline;
}
.sessions-view .v-list-item-subtitle {
  opacity: 1;
  color: #8a969e;
}
.sessions-view .v-icon.pr-icon svg {
  width: 20px;
  height: 20px;
}
.sessions-view .octicon-file-diff {
  width: 20px;
  height: 20px;
}
.sessions-view .file-diff span {
  line-height: 0.5;
}
</style>
