<script setup>
import { inject, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getFilesListFromSession, getSessionDetails } from "@/api/index.js";
import {
  checkStatusMethod,
  queryFilesListMethod,
  querySessionDetailsMethod,
} from "@/methods/session-view/index.js";
import OctIcon from "@/components/global/OctIcon.vue";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import OffsetPagination from "@/components/global/OffsetPagination.vue";
import { ActionTabSession } from "@/components/session";
import { DeleteFile, DuplicateFile } from "@/components/file";
import { encodeString, preventListItemClick } from "@/helpers/index.js";
import { BASE_PATH, AUTOMATION, DISABLE_MANUAL_FILE_CREATION } from "@/enums";
import "@eox/jsonform";
import Automation from "@/components/session/Automation.vue";
import find from "lodash/find";
import { FileBrowserDrawer } from "@/components/file-browser";
import { useI18n } from "vue-i18n";
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const sessionNumber = route.params.sessionNumber;

const session = ref(null);
const fileChangesList = ref(null);
const totalPage = ref(0);
const page = ref(route.query.page ? parseInt(route.query.page, 10) : 1);
const hover = ref(null);
const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");
const fileBrowserDrawer = inject("set-file-browser-drawer");

const automationDialog = ref(false);
const selectedAutomation = ref(null);
const suggestionList = ref([]);

const updateDetails = async (cache = false) => {
  fileChangesList.value = null;
  window.scrollTo({ top: 0 });
  const sessionDetails = await getSessionDetails(sessionNumber);
  querySessionDetailsMethod(sessionDetails, {
    snackbar,
    session,
    navPaginationItems,
  });

  if (session.value.closed_at) navButtonConfig.value.disabled = true;
  checkStatusMethod(session);

  const fileChanges = await getFilesListFromSession(
    sessionNumber,
    page.value,
    cache,
  );
  queryFilesListMethod(fileChanges, { snackbar, fileChangesList, totalPage });

  if (session.value.state !== "closed") {
    navButtonConfig.value.disabled = false;
  }
};

onMounted(async () => {
  const availableAutomation = [
    ...AUTOMATION.filter((automation) => !automation.hidden),
  ];

  if (DISABLE_MANUAL_FILE_CREATION) {
    suggestionList.value = availableAutomation;
  } else {
    suggestionList.value = [
      ...availableAutomation,
      {
        title: "Add/Edit File Manually",
        description:
          "Create or edit a file by entering the file path and details manually.",
        icon: "mdi-pencil-plus-outline",
        func: () => (fileBrowserDrawer.value = true),
        manual: true,
      },
      {
        title: "Upload Files",
        description: "Upload files from your computer.",
        icon: "mdi-upload",
        func: () => (fileBrowserDrawer.value = true),
        manual: true,
      },
    ];
  }

  if (availableAutomation.length) {
    navButtonConfig.value = {
      text: t("buttonText.automation"),
      icon: "mdi-auto-fix",
      list: availableAutomation.map((suggestion) => ({
        ...suggestion,
        click: () => handleAutomationClick(suggestion),
        icon: "mdi-auto-fix",
      })),
      disabled: true,
    };
  }

  if (route.query.automation) {
    const automation = find(AUTOMATION, { id: route.query.automation });
    if (automation) handleAutomationClick(automation);
  }

  await updateDetails();
});

const onPageChange = async (newPage) => {
  page.value = newPage;
  await router.push({ query: { ...route.query, page: newPage } });
  await updateDetails(true);
};

const handleAutomationClick = (automation) => {
  selectedAutomation.value = automation;
  automationDialog.value = true;
};

const handleAutomationClose = () => {
  selectedAutomation.value = null;
  automationDialog.value = false;
};
</script>

<template>
  <FileBrowserDrawer
    v-if="session"
    :updateDetails="updateDetails"
    :session="session"
  />
  <ActionTabSession :session :updateDetails />

  <v-list class="py-0">
    <!-- file's list -->
    <v-list-item
      v-if="fileChangesList && fileChangesList.length"
      v-for="(file, index) in fileChangesList"
      :key="file.title"
      :title="file.title"
      class="files-view files-list py-4 border-b-thin"
      @mouseenter="hover = index"
      @mouseleave="hover = null"
      @click.native.capture="preventListItemClick"
      :to="
        !session.closed_at
          ? `/${session.number}/${encodeString(file.title)}`
          : null
      "
    >
      <template v-slot:title>
        <div class="d-flex align-start px-5">
          <v-icon :color="file.state.color" class="file-icon opacity-100">
            <OctIcon :name="file.state.icon" />
          </v-icon>
          <div class="ml-4">
            <div class="d-flex align-center ga-3">
              <div
                class="main-title file-title text-black"
                :class="{
                  'font-weight-bold': hover === index && !session.closed_at,
                }"
              >
                {{ file.title }}
              </div>
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

      <template v-slot:append v-if="!session.closed_at">
        <div class="action-list d-flex align-center">
          <DuplicateFile :file :session :callBack="updateDetails" />
          <DeleteFile :file :session :callBack="updateDetails" />
        </div>
      </template>
    </v-list-item>

    <!-- Placeholder for file's list -->
    <ListPlaceholder :button="1" v-else-if="fileChangesList === null" />

    <!-- Empty State -->
    <v-empty-state
      v-else
      action-icon="mdi-pencil-plus"
      :image="`${BASE_PATH}img/files.svg`"
      :text="`No changes found in this session.
        ${
          !session.closed_at
            ? 'You can start a new file to add updates.'
            : 'You can start a new session to add updates.'
        }
      `"
      title="No changes found in this session"
      class="my-16 py-16 empty-state"
    >
      <template v-slot:actions v-if="!session.closed_at">
        <v-container class="pa-4 pt-10">
          <v-row class="justify-center">
            <!-- Dynamic automation buttons -->
            <v-col
              v-for="(automation, index) in suggestionList"
              :key="index"
              cols="12"
              md="4"
            >
              <v-card
                variant="outlined"
                color="blue-grey-lighten-4"
                class="rounded-lg pa-4"
              >
                <v-btn
                  block
                  color="primary"
                  class="text-white mb-4 py-6 text-body-1 font-weight-regular"
                  style="text-transform: none"
                  :prepend-icon="automation.icon || 'mdi-auto-fix'"
                  @click="
                    automation.func?.() || handleAutomationClick(automation)
                  "
                >
                  {{ automation.title }}
                </v-btn>
                <div class="px-4 pb-4">
                  <div class="d-flex">
                    <v-icon size="18" color="grey" class="mr-2"
                      >mdi-information</v-icon
                    >
                    <span class="text-grey-darken-1 text-body-2">
                      {{ automation.description }}
                    </span>
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </v-empty-state>
  </v-list>

  <OffsetPagination v-if="fileChangesList" :page :totalPage :onPageChange />

  <!-- Use the Automation component -->
  <v-dialog
    v-if="session"
    :class="selectedAutomation?.hidden ? 'd-none' : ''"
    v-model="automationDialog"
    max-width="500px"
  >
    <Automation
      :handleAutomationClose
      :updateDetails
      :automationDialog
      :selectedAutomation
      :session
    />
  </v-dialog>
</template>

<style>
.diff-block span {
  width: 12px;
  height: 12px;
  border: 1px solid white;
}
.v-empty-state__actions {
  width: 100%;
}
</style>
