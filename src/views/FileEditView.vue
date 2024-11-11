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
const previewURL = ref(null);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const updateFileDetails = async (cache = true) => {
  fileContent.value = null;
  previewURL.value = null;
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
    previewURL,
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
      : updatedFileContent.value,
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
  initEOXJSONFormMethod(jsonFormInstance, isFormJSON);
  if (isFormJSON.value) {
    hideHiddenFieldsMethod(jsonFormInstance);
  }

  window.addEventListener("message", function (event) {
    if (
      event.origin === window.location.origin &&
      event.data &&
      event.data.type === "SCHEMA_DATA_PREVIEW_UPDATE" &&
      event.data.detail
    ) {
      const newSchema = updateSchemaDefaults(
        JSON.parse(fileContent.value),
        event.data.detail,
      );

      if (!isEqual(updatedFileContent.value, newSchema)) {
        jsonFormInstance.value.editor.setValue(event.data.detail);
      }
    }
  });
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
  if (e.detail && !e.detail.file && isFormJSON.value) {
    const newSchema = updateSchemaDefaults(
      JSON.parse(fileContent.value),
      e.detail,
    );

    const previewFrame = document.getElementById("previewFrame");
    const message = {
      type: "SCHEMA_DATA_EDITOR_UPDATE",
      detail: e.detail,
    };

    if (!updatedFileContent.value) {
      initValue.value = e.detail;
      updatedFileContent.value = newSchema;
      fileContent.value = JSON.stringify(newSchema);
      setTimeout(
        () =>
          previewFrame.contentWindow.postMessage(
            message,
            window.location.origin,
          ),
        1000,
      );
    } else if (!isEqual(updatedFileContent.value, newSchema)) {
      updatedFileContent.value = newSchema;
      previewFrame.contentWindow.postMessage(message, window.location.origin);

      updateNavButtonConfig("Save", false);
    } else updateNavButtonConfig();

    if (isEqual(updatedFileContent.value, JSON.parse(fileContent.value)))
      updateNavButtonConfig();

    hideHiddenFieldsMethod(jsonFormInstance);
  } else {
    if (!updatedFileContent.value) {
      initValue.value = e.detail;
      fileContent.value = e.detail.file;
    }
    if (e.detail.file === atob(file.value.content)) {
      updateNavButtonConfig();
    } else {
      updateNavButtonConfig("Save", false);
    }
    updatedFileContent.value = e.detail.file;
  }
};

const resetContent = () => {
  jsonFormInstance.value.editor.setValue(initValue.value);
  updateNavButtonConfig();
};

const getFileSchema = () => {
  return {
    title: "git-clerk",
    type: "object",
    properties: {
      file: {
        type: "string",
        format: "textarea",
        default: fileContent.value,
      },
    },
  };
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
    :class="`bg-white fill-height px-12 py-8 d-block file-editor ${!isFormJSON && 'file-editor-code'}`"
  >
    <h2>{{ session.title }}</h2>
    <p>{{ filePath }}</p>

    <div>
      <eox-jsonform
        :schema="isFormJSON ? JSON.parse(fileContent) : getFileSchema()"
        :noShadow="false"
        :unstyled="false"
        @change="onFileChange"
      ></eox-jsonform>
      <iframe
        v-if="previewURL"
        id="previewFrame"
        :src="previewURL"
        width="100%"
        height="300"
      ></iframe>
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
.file-editor:not(.file-editor-code) .je-indented-panel > div > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.file-editor textarea.v-field__input {
  padding: 10px;
  height: 66vh;
  background: #f6f6f6 !important;
}
</style>
