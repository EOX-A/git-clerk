<script setup>
import { inject, onMounted, onUnmounted, ref } from "vue";
import {
  createAndUpdateFile,
  getFileDetails,
  getSessionDetails,
} from "@/api/index.js";
import { useRoute, useRouter } from "vue-router";
import { querySessionDetailsMethod } from "@/methods/session-view/index.js";
import { decodeString, getFileSchema, useLoader } from "@/helpers/index.js";
import {
  queryFileDetailsMethod,
  initEOXJSONFormMethod,
  hideHiddenFieldsMethod,
  debouncePostMessageMethod,
  jsonSchemaFileChangeMethod,
  genericFileChangeMethod,
  addPostMessageEventMethod,
} from "../methods/file-edit-view";
import { ActionTabFileEditor } from "@/components/file/index.js";
import debounce from "lodash.debounce";
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

const debouncedPostMessage = debounce(debouncePostMessageMethod, 500);

const updateFileDetails = async (cache = true) => {
  updatedFileContent.value = null;
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
    await updateFileDetails(false);
    initEOXJSONFormMethod(jsonFormInstance, isFormJSON, previewURL);
    updateNavButtonConfig();
  }
  loader.hide();
};

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
  const detail = e.detail;
  const props = {
    file,
    detail,
    initValue,
    fileContent,
    jsonFormInstance,
    updatedFileContent,
    debouncedPostMessage,
    updateNavButtonConfig,
  };

  if (e.detail && e.detail.file === undefined && isFormJSON.value)
    jsonSchemaFileChangeMethod(props);
  else genericFileChangeMethod(props);
};

const resetContent = () => {
  jsonFormInstance.value.editor.setValue(initValue.value);
  initEOXJSONFormMethod(jsonFormInstance, isFormJSON, previewURL);
  updateNavButtonConfig();
};

onMounted(async () => {
  const loader = useLoader().show();
  updateNavButtonConfig();
  await updateFileDetails();
  initEOXJSONFormMethod(jsonFormInstance, isFormJSON, previewURL);
  if (isFormJSON.value) {
    hideHiddenFieldsMethod(jsonFormInstance);
  }
  addPostMessageEventMethod({
    previewURL,
    fileContent,
    updatedFileContent,
    jsonFormInstance,
    isFormJSON,
  });
  loader.hide();
});

onUnmounted(() => {
  debouncedPostMessage.cancel();
});
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
    :class="`bg-white px-12 py-8 d-block file-editor ${!isFormJSON && 'file-editor-code'}`"
  >
    <h2>{{ session.title }}</h2>
    <p>{{ filePath }}</p>

    <v-row no-gutters :class="previewURL ? 'd-flex mt-6' : ''">
      <v-col v-if="previewURL" class="mt-2 file-preview">
        <div class="preview-toolbar bg-secondary">
          <p
            class="text-uppercase font-weight-bold text-sm-body-2 text-blue-grey-darken-2 d-flex align-center ga-2 mx-3"
          >
            <v-icon icon="mdi-monitor-eye"></v-icon> PREVIEW
          </p>
        </div>
        <iframe
          v-if="previewURL"
          id="previewFrame"
          :src="previewURL"
          height="300"
        ></iframe>
      </v-col>
      <v-col :cols="previewURL ? 3 : 12" class="overflow-x-auto">
        <eox-jsonform
          :schema="
            isFormJSON ? JSON.parse(fileContent) : getFileSchema(fileContent)
          "
          :noShadow="false"
          :unstyled="false"
          :class="previewURL ? 'with-preview' : ''"
          @change="onFileChange"
        ></eox-jsonform>
      </v-col>
    </v-row>
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
.file-editor {
  height: 95%;
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
.file-preview iframe {
  box-sizing: border-box;
  border: 1px solid #ced4da;
  border-bottom-left-radius: 4px;
  font: inherit;
  z-index: 0;
  word-wrap: break-word;
  width: 100%;
  height: calc(100vh - 318px);
}

.file-preview {
  width: 100%;
}

.file-preview .preview-toolbar {
  position: relative;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -o-user-select: none;
  user-select: none;
  padding: 13.5px 10px;
  border-top: 1px solid #ced4da;
  border-left: 1px solid #ced4da;
  border-right: 1px solid #ced4da;
  border-top-left-radius: 4px;
}

.file-preview .preview-toolbar p {
  letter-spacing: 0.25px !important;
}

.file-editor .with-preview {
  width: 35vw;
}
</style>
