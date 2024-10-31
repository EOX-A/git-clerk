<script setup>
import { inject, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getFilesListFromSession, getSessionDetails } from "@/api/index.js";
import {
  queryFilesListMethod,
  querySessionDetailsMethod,
} from "@/methods/session-view/index.js";
import OctIcon from "@/components/global/OctIcon.vue";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import ListPagination from "@/components/global/ListPagination.vue";
import EmptyState from "@/components/global/EmptyState.vue";
import { DeleteFile, ActionTabFileList, CreateFile } from "@/components/file";
import { encodeString } from "@/helpers/index.js";

const route = useRoute();
const router = useRouter();
const sessionNumber = route.params.sessionNumber;

const session = ref(null);
const fileChangesList = ref(null);
const loader = ref({});
const totalPage = ref(0);
const deleteFile = ref(false);
const addNewFileDialog = ref(false);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const addNewFileClick = async (state) => {
  addNewFileDialog.value = state;
};

const updateDetails = async (cache = false) => {
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
    click: () => addNewFileClick(true),
  };
  await updateDetails();
});

const onPageChange = async (newPage) => {
  page.value = newPage;
  await router.push({ query: { ...route.query, page: newPage } });
  await updateDetails(true);
};
</script>

<template>
  <CreateFile
    v-if="session && addNewFileClick"
    :updateDetails
    :addNewFileClick
    :open="addNewFileDialog"
    :session
  />
  <ActionTabFileList :session :updateDetails />

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
                :to="`/${session.number}/${encodeString(file.title)}`"
                class="main-title text-black"
              >
                {{ file.title }}
              </router-link>
            </div>
            <div class="v-list-item-subtitle d-flex align-center pt-2 ga-2">
              <span class="text-green-darken-1 font-weight-bold"
                >+{{ file.additions }}</span
              >
              <span class="text-red-darken-1 font-weight-bold"
                >-{{ file.deletions }}</span
              >
              <div class="diff-block ml-2">
                <span
                  v-for="color in file.diffColor"
                  :class="`bg-${color}-darken-1 d-inline-flex`"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-slot:append>
        <DeleteFile :file :session :call-back="updateDetails" />
      </template>
    </v-list-item>

    <!-- Placeholder for file's list -->
    <ListPlaceholder :button="2" v-else-if="fileChangesList === null" />

    <!-- Empty State -->
    <EmptyState
      v-else
      icon="mdi-file-code-outline"
      headline="Whoops, No File changes found."
      btn-text="Add New File"
      :init-func="addNewFileClick"
    />
  </v-list>

  <ListPagination v-if="fileChangesList" :page :totalPage :onPageChange />
</template>

<style>
.diff-block span {
  width: 12px;
  height: 12px;
  border: 1px solid white;
}
</style>
