<script setup>
import { inject, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  deleteFileBySHA,
  getFilesListFromSession,
  getSessionDetails,
} from "@/api/index.js";
import {
  queryFilesListMethod,
  querySessionDetailsMethod,
} from "@/methods/session-view/index.js";
import OctIcon from "@/components/global/OctIcon.vue";
import Tooltip from "@/components/global/Tooltip.vue";
import { useLoader } from "@/helpers/index.js";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import { DeleteSession } from "@/components/session/index.js";

const route = useRoute();
const router = useRouter();
const sessionNumber = route.params.sessionNumber;

const session = ref(null);
const fileChangesList = ref(null);
const loader = ref({});
const totalPage = ref(0);
const deleteFile = ref(false);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const addNewFileClick = async () => {};

const updateSessionDetails = async (cache = false) => {
  fileChangesList.value = null;
  window.scrollTo({ top: 0 });
  const sessionDetails = await getSessionDetails(sessionNumber);
  querySessionDetailsMethod(sessionDetails, {
    snackbar,
    session,
    navPaginationItems,
  });
  const fileChanges = await getFilesListFromSession(
    sessionNumber,
    page.value,
    cache,
  );
  queryFilesListMethod(fileChanges, { snackbar, fileChangesList, totalPage });
};

onMounted(async () => {
  navButtonConfig.value = {
    text: "Add New File",
    icon: "mdi-plus",
    click: addNewFileClick,
  };
  await updateSessionDetails();
});

const onPageChange = async (newPage) => {
  page.value = newPage;
  await router.push({ query: { ...route.query, page: newPage } });
  await updateSessionDetails(true);
};

const deleteFileHandle = async () => {
  if (deleteFile.value) {
    loader.value = useLoader().show();
    const owner = session.value.head.repo.owner.login;
    const repo = session.value.head.repo.name;
    const path = deleteFile.value.title;
    const message = `Deleting ${path} file from the pull request`;
    const sha = deleteFile.value.sha;
    const ref = session.value.head.ref;

    snackbar.value = await deleteFileBySHA(
      owner,
      repo,
      path,
      message,
      sha,
      ref,
    );

    deleteFile.value = false;
    loader.value.hide();
    await updateSessionDetails();
  }
};
</script>

<template>
  <div
    v-if="session"
    class="bg-secondary px-5 py-4 d-flex align-center ga-1 session-tab"
  >
    <v-btn
      :href="session.html_url"
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-github"
      size="x-large"
      variant="text"
      text="Github"
      class="text-capitalize font-weight-medium"
    ></v-btn>
    <DeleteSession
      text="Delete Session"
      size="x-large"
      :session="session"
      :snackbar="snackbar"
      :callBack="updateSessionDetails"
    />
    <v-btn
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-monitor-eye"
      size="x-large"
      variant="text"
      text="Preview"
      class="text-capitalize font-weight-medium"
    ></v-btn>
    <v-divider inset vertical></v-divider>
    <v-btn
      v-if="!session.draft || session.state === 'closed'"
      target="_blank"
      color="primary"
      prepend-icon="mdi-dots-horizontal-circle-outline"
      size="x-large"
      variant="flat"
      text="Pending Review"
      class="text-capitalize font-weight-medium ml-5"
      disabled
    ></v-btn>
    <v-btn
      v-else
      target="_blank"
      color="blue-grey-lighten-4"
      prepend-icon="mdi-file-document-edit"
      size="x-large"
      variant="flat"
      text="Submit for Review"
      class="text-capitalize font-weight-medium ml-5"
      :disabled="!session.draft || session.state === 'closed'"
    ></v-btn>
  </div>

  <v-list class="py-0">
    <!-- file's list -->
    <v-list-item
      v-if="fileChangesList && fileChangesList.length"
      v-for="file in fileChangesList"
      :key="file.title"
      :title="file.title"
      class="files-view py-4 border-b-thin"
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-icon :color="file.state.color" class="file-icon opacity-100">
            <OctIcon :name="file.state.icon" />
          </v-icon>
          <div class="ml-4">
            <div class="d-flex align-center ga-3">
              <router-link
                :to="`/${session.number}/${file.sha}`"
                class="main-title text-black"
              >
                {{ file.title }}
              </router-link>
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
            :href="file.blob_url"
            target="_blank"
            color="blue-grey-darken-4"
            icon="mdi-github"
            size="large"
            variant="text"
          ></v-btn>
        </Tooltip>
        <Tooltip text="Delete File">
          <v-btn
            color="blue-grey-darken-4"
            icon="mdi-delete-outline"
            size="large"
            variant="text"
            @click="deleteFile = file"
            :disabled="file.status === 'removed'"
          ></v-btn>
        </Tooltip>
      </template>
    </v-list-item>

    <!-- Placeholder for file's list -->
    <ListPlaceholder :button="2" v-else-if="fileChangesList === null" />

    <v-empty-state
      v-else
      headline="Whoops, No File changes found."
      icon="mdi-source-pull"
      class="my-16 py-16"
    >
      <template v-slot:text>
        To get started, you should
        <a
          @click="addNewFileClick"
          class="text-blue-accent-4 font-weight-medium"
          href="#"
          >Add New File</a
        >
      </template>
    </v-empty-state>
  </v-list>

  <div class="text-center border-t-thin py-6 bg-background">
    <v-pagination
      v-if="fileChangesList"
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

  <v-dialog v-model="deleteFile" width="auto">
    <v-card max-width="400" prepend-icon="mdi-alert" title="Delete Session">
      <template v-slot:text>
        Are you sure you want to delete the file:
        <strong>{{ deleteFile.title }}</strong>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn @click="deleteFile = false"> Cancel </v-btn>
        <v-btn color="red" variant="flat" @click="deleteFileHandle">
          Delete
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
.session-tab .v-btn__content {
  font-size: 16px;
}
.session-tab .v-btn--disabled.v-btn--variant-flat .v-btn__overlay {
  opacity: 0;
}

.session-tab .v-btn__prepend {
  font-size: 20px;
  margin-inline-end: 6px;
}
</style>
