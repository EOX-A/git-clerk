<script setup>
import { inject, onMounted, ref } from "vue";
import {
  createAndUpdateFile,
  getFileDetails,
  getSessionDetails,
} from "@/api/index.js";
import { useRoute, useRouter } from "vue-router";
import { querySessionDetailsMethod } from "@/methods/session-view/index.js";
import {
  decodeString,
  updateSchemaDefaults,
  useLoader,
} from "@/helpers/index.js";
import {
  queryFileDetailsMethod,
  initEOXJSONFormMethod,
  hideHiddenFieldsMethod,
} from "../methods/file-edit-view";
import { ActionTabFileEditor } from "@/components/file/index.js";
import isEqual from "lodash.isequal";
import "@eox/jsonform";

const route = useRoute();
const router = useRouter();
const sessionNumber = route.params.sessionNumber;
const filePath = decodeString(route.params.encodedFilePath);

const session = ref(null);
const file = ref(null);
const fileContent = ref(null);
const reset = ref(false);
const updatedFileContent = ref(null);
const initValue = ref(null);
const jsonFormInstance = ref(null);
const isFormJSON = ref(false);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const updateFileDetails = async (cache = true) => {
  fileContent.value = null;
  window.scrollTo({ top: 0 });
  const sessionDetails = await getSessionDetails(sessionNumber);
  querySessionDetailsMethod(sessionDetails, {
    snackbar,
    session,
    navPaginationItems,
  });
  const fileDetails = await getFileDetails(session, filePath, cache);
  queryFileDetailsMethod(fileDetails, {
    snackbar,
    file,
    navPaginationItems,
    fileContent,
    isFormJSON,
  });
};

const saveFile = async () => {
  const loader = useLoader().show();
  snackbar.value = await createAndUpdateFile(
    session.value,
    filePath,
    file.value.name,
    isFormJSON.value
      ? JSON.stringify(updatedFileContent.value, null, 2)
      : fileContent.value,
    file.value.sha,
  );

  if (snackbar.value.status === "success") {
    updatedFileContent.value = null;
    await updateFileDetails(false);
    initEOXJSONFormMethod(jsonFormInstance, isFormJSON);
    updateNavButtonConfig();
  }
  loader.hide();
};

onMounted(async () => {
  const loader = useLoader().show();
  updateNavButtonConfig();
  await updateFileDetails();
  if (isFormJSON.value) {
    initEOXJSONFormMethod(jsonFormInstance, isFormJSON);
    hideHiddenFieldsMethod(jsonFormInstance);
  }
  loader.hide();
});

const updateNavButtonConfig = (text = "Saved", disabled = true) => {
  navButtonConfig.value = {
    text,
    disabled,
    click: () => saveFile(),
    icon: "mdi-cloud-upload-outline",
  };
  reset.value = disabled;
};

const onFileChange = (e) => {
  if (e.detail && isFormJSON.value) {
    const newSchema = updateSchemaDefaults(
      JSON.parse(fileContent.value),
      e.detail,
    );

    if (!updatedFileContent.value) {
      initValue.value = e.detail;
      updatedFileContent.value = newSchema;
      fileContent.value = JSON.stringify(newSchema);
    } else if (!isEqual(updatedFileContent.value, newSchema)) {
      updatedFileContent.value = newSchema;
      updateNavButtonConfig("Save", false);
    } else updateNavButtonConfig();

    if (isEqual(updatedFileContent.value, JSON.parse(fileContent.value)))
      updateNavButtonConfig();

    hideHiddenFieldsMethod(jsonFormInstance);
  } else {
    if (fileContent.value === atob(file.value.content)) {
      updateNavButtonConfig();
    } else {
      updateNavButtonConfig("Save", false);
    }
  }
};

const resetContent = () => {
  if (isFormJSON.value) {
    jsonFormInstance.value.editor.setValue(initValue.value);
  } else {
    fileContent.value = atob(file.value.content);
  }
  updateNavButtonConfig();
};
</script>

<template>
  <ActionTabFileEditor
    v-if="session && file"
    :file
    :session
    :reset
    :resetContent
  />

  <div
    v-if="fileContent !== null"
    class="bg-white fill-height px-12 py-8 d-block file-editor"
  >
    <h2>{{ session.title }}</h2>
    <p>{{ filePath }}</p>

    <div v-if="isFormJSON">
      <eox-jsonform
        :schema="JSON.parse(fileContent)"
        :noShadow="false"
        :unstyled="false"
        @change="onFileChange"
      ></eox-jsonform>
    </div>
    <div v-else class="mt-8">
      <v-textarea
        v-model="fileContent"
        class="bg-white text-mono"
        label="File Content"
        variant="outlined"
        @change="onFileChange"
      ></v-textarea>
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
.file-editor .je-indented-panel .row {
  margin-top: 10px;
  padding: 10px;
}
.file-editor .je-indented-panel > div > div {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two equal columns */
  gap: 10px;
}
.file-editor textarea.v-field__input {
  padding: 10px;
  height: 66vh;
  background: #f6f6f6 !important;
}
</style>
