<script setup>
import { inject, onMounted, onUnmounted, ref } from "vue";
import {
  createAndUpdateFile,
  fetchSchemaFromURL,
  getFileDetails,
  getSessionDetails,
} from "@/api/index.js";
import { useRoute, useRouter } from "vue-router";
import { querySessionDetailsMethod } from "@/methods/session-view/index.js";
import {
  decodeString,
  getFileSchema,
  getSchemaDetails,
  stringifyIfNeeded,
  useLoader,
} from "@/helpers/index.js";
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
import "@eox/drawtools";
import "@eox/map";
import { CUSTOM_EDITOR_INTERFACES, GENERATE_ENUMS } from "@/enums";

const route = useRoute();
const router = useRouter();
const sessionNumber = route.params.sessionNumber;
const filePath = decodeString(route.params.encodedFilePath);

const session = ref(null);
const file = ref(null);
const fileContent = ref(null);
const reset = ref(false);
const updatedFileContent = ref(null);
const jsonFormInstance = ref(null);
const isSchemaBased = ref(false);
const previewURL = ref(null);
const schemaMetaDetails = ref(null);

const snackbar = inject("set-snackbar");
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");

const debouncedPostMessage = debounce(debouncePostMessageMethod, 500);

const updateFileDetails = async (cache = true) => {
  updatedFileContent.value = null;
  fileContent.value = null;
  previewURL.value = null;
  schemaMetaDetails.value = null;
  window.scrollTo({ top: 0 });

  const sessionDetails = await getSessionDetails(sessionNumber);
  querySessionDetailsMethod(sessionDetails, {
    snackbar,
    session,
    navPaginationItems,
  });

  const schemaDetails = getSchemaDetails("/" + filePath) || getFileSchema();

  const schema =
    schemaDetails.schema || (await fetchSchemaFromURL(schemaDetails.url));

  schemaMetaDetails.value = {
    ...schemaDetails,
    schema,
  };

  schemaMetaDetails.value = await GENERATE_ENUMS(
    schemaMetaDetails.value,
    session.value,
    cache,
    { getFileDetails },
  );

  const fileDetails = await getFileDetails(session.value, filePath, cache);
  queryFileDetailsMethod(fileDetails, {
    snackbar,
    file,
    navPaginationItems,
    fileContent,
    isSchemaBased,
    previewURL,
    schemaMetaDetails,
  });
};

const saveFile = async () => {
  const loader = useLoader().show();
  snackbar.value = await createAndUpdateFile(
    session.value,
    filePath,
    file.value.name,
    isSchemaBased.value
      ? stringifyIfNeeded(
          schemaMetaDetails.value.output
            ? updatedFileContent.value[schemaMetaDetails.value.output]
            : updatedFileContent.value,
          decodeString(file.value.content),
        )
      : updatedFileContent.value,
    file.value.sha,
  );

  if (snackbar.value.status === "success") {
    if (
      typeof updatedFileContent.value !== "string" &&
      Object.keys(CUSTOM_EDITOR_INTERFACES).some(
        (key) => key in updatedFileContent.value,
      )
    ) {
      for (let key in CUSTOM_EDITOR_INTERFACES) {
        await CUSTOM_EDITOR_INTERFACES[key].operation.save(
          updatedFileContent.value[key],
          fileContent.value[key],
          CUSTOM_EDITOR_INTERFACES[key],
          filePath,
          updatedFileContent.value.title,
          session.value,
          { createAndUpdateFile, getFileDetails, stringifyIfNeeded },
        );
      }
    }
    await updateFileDetails(false);
    initEOXJSONFormMethod(jsonFormInstance, isSchemaBased, previewURL);
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
    fileContent,
    jsonFormInstance,
    updatedFileContent,
    debouncedPostMessage,
    updateNavButtonConfig,
  };

  if (e.detail && isSchemaBased.value) jsonSchemaFileChangeMethod(props);
  else genericFileChangeMethod(props);
};

const resetContent = () => {
  jsonFormInstance.value.editor.setValue(fileContent.value);
  initEOXJSONFormMethod(jsonFormInstance, isSchemaBased, previewURL);
  updateNavButtonConfig();
};

onMounted(async () => {
  const loader = useLoader().show();
  updateNavButtonConfig();
  await updateFileDetails();
  if (file.value.encoding !== "none") {
    initEOXJSONFormMethod(jsonFormInstance, isSchemaBased, previewURL);
    if (isSchemaBased.value) {
      hideHiddenFieldsMethod(jsonFormInstance);
    }
    addPostMessageEventMethod({
      previewURL,
      updatedFileContent,
      jsonFormInstance,
      isSchemaBased,
    });
  }
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
    v-if="fileContent !== null && schemaMetaDetails.schema"
    :class="`bg-white ${!previewURL && 'px-4 px-sm-12 py-4 py-sm-8 non-preview-height'} d-block file-editor ${schemaMetaDetails.generic && 'file-editor-code'}`"
  >
    <div
      class="d-flex align-center align-self-center justify-center flex-column py-12"
      v-if="file.encoding === 'none'"
    >
      <p class="text-sm-body-2 text-blue-grey-darken-2">
        Sorry about that, but we can’t show files that are this big right now.
      </p>
      <router-link
        class="text-sm-body-2 text-blue-darken-2 font-weight-bold"
        :href="file.download_url"
        target="_blank"
        >View Raw</router-link
      >
    </div>
    <v-row v-else no-gutters :class="previewURL ? 'd-block d-sm-flex' : ''">
      <v-col :cols="previewURL ? 3 : 12" class="overflow-x-auto">
        <eox-jsonform
          :schema="schemaMetaDetails.schema"
          :value="fileContent"
          :noShadow="false"
          :unstyled="false"
          :class="previewURL ? 'with-preview' : ''"
          @change="onFileChange"
          :customEditorInterfaces="Object.values(CUSTOM_EDITOR_INTERFACES)"
        ></eox-jsonform>
      </v-col>
      <v-col v-if="previewURL" class="file-preview">
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
.file-editor.non-preview-height {
  min-height: 95%;
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
  font: inherit;
  z-index: 0;
  word-wrap: break-word;
  width: 100%;
  height: calc(100vh - 194px);
}

.file-preview {
  width: 100%;
  line-height: 0px;
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
}

.file-preview .preview-toolbar p {
  letter-spacing: 0.25px !important;
}

.file-editor .with-preview {
  width: 35vw;
}

@media (max-width: 600px) {
  .file-editor .v-col-3 {
    max-width: 100vw;
  }
}
</style>
