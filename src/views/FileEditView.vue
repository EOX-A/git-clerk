<script setup>
import { inject, onMounted, ref } from "vue";
import { getFileDetails, getSessionDetails } from "@/api/index.js";
import { useRoute, useRouter } from "vue-router";
import { querySessionDetailsMethod } from "@/methods/session-view/index.js";
import { decodeString, isValidFormJSON } from "@/helpers/index.js";
import queryFileDetailsMethod from "../methods/file-edit-view/query-file-details.js";
import { DeleteFile } from "@/components/file/index.js";
import "@eox/jsonform/dist/eox-jsonform.js";

const route = useRoute();
const router = useRouter();
const sessionNumber = route.params.sessionNumber;
const filePath = decodeString(route.params.encodedFilePath);

const session = ref(null);
const file = ref(null);
const fileContent = ref(null);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const updateFileDetails = async () => {
  fileContent.value = null;
  window.scrollTo({ top: 0 });
  const sessionDetails = await getSessionDetails(sessionNumber);
  querySessionDetailsMethod(sessionDetails, {
    snackbar,
    session,
    navPaginationItems,
  });
  const fileDetails = await getFileDetails(session, filePath);
  queryFileDetailsMethod(fileDetails, {
    snackbar,
    file,
    navPaginationItems,
    fileContent,
  });
};

const saveFile = async () => {};

onMounted(async () => {
  navButtonConfig.value = {
    text: "Saved",
    icon: "mdi-cloud-upload-outline",
    disabled: true,
    click: () => saveFile(),
  };
  await updateFileDetails();
});
</script>

<template>
  <div
    v-if="session"
    class="bg-secondary px-5 py-4 d-flex align-center ga-1 action-tab"
  >
    <DeleteFile
      text="Delete File"
      size="x-large"
      :file
      :session
      :call-back="updateFileDetails"
    />
  </div>

  <div v-if="fileContent" class="bg-white px-12 py-10 d-block">
    <h2>{{ session.title }}</h2>
    <p>{{ file.name }}</p>

    <eox-jsonform
      v-if="isValidFormJSON(fileContent)"
      :schema="JSON.parse(fileContent)"
    ></eox-jsonform>
    <div v-else>
      <p>Not a correct json-form</p>
    </div>
  </div>
</template>

<style>
.action-tab .v-btn__content {
  font-size: 16px;
}
.action-tab .v-btn--disabled.v-btn--variant-flat .v-btn__overlay {
  opacity: 0;
}
.action-tab .v-btn__prepend {
  font-size: 20px;
  margin-inline-end: 6px;
}
</style>
