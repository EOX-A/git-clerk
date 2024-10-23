<script setup>
import { inject, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getFilesListFromSession, getSessionDetails } from "@/api/index.js";
import {
  queryFilesListMethod,
  querySessionDetailsMethod,
} from "@/methods/session-view/index.js";
import OctIcon from "@/components/global/OctIcon.vue";
import Tooltip from "@/components/global/Tooltip.vue";

const route = useRoute();
const router = useRouter();
const sessionNumber = route.params.sessionNumber;

const session = ref(null);
const fileChangesList = ref(null);
const snackbar = ref(false);
const totalPage = ref(0);
const deleteFile = ref(false);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);
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
</script>

<template>
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
    <v-list-item
      v-else-if="fileChangesList === null"
      v-for="n in 10"
      :key="n"
      :title="n"
      class="files-view py-4 border-b-thin"
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
          v-for="a in 2"
          :key="a"
          width="24"
          type="heading"
          class="mx-3"
        ></v-skeleton-loader>
      </template>
    </v-list-item>
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

  <v-snackbar
    v-model="snackbar"
    timeout="3000"
    :color="snackbar.status"
    :text="snackbar.text"
  >
  </v-snackbar>
</template>

<style></style>
