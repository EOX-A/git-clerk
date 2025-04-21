<script setup>
import { inject, onMounted, onUnmounted, ref, h } from "vue";
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
  debouncePostMessageMethod,
  jsonSchemaFileChangeMethod,
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
const customInterfaces = ref([]);
const previewExpanded = ref(false);
const showPreview = ref(window.innerWidth >= 960);

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

  const schemaDetails =
    getSchemaDetails("/" + filePath) ||
    getFileSchema(filePath.split(".")[filePath.split(".").length - 1]);

  const schema =
    schemaDetails.schema || (await fetchSchemaFromURL(schemaDetails.url));

  schemaMetaDetails.value = {
    ...schemaDetails,
    schema,
  };

  if (GENERATE_ENUMS) {
    schemaMetaDetails.value = await GENERATE_ENUMS(
      schemaMetaDetails.value,
      session.value,
      cache,
      { getFileDetails },
    );
  }

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
  const loader = useLoader().show(
    {},
    {
      after: h(
        "h5",
        { class: "loader-text", id: "loader-text" },
        "Updating file...",
      ),
    },
  );
  const content = {
    data: isSchemaBased.value
      ? stringifyIfNeeded(
          schemaMetaDetails.value.output
            ? updatedFileContent.value[schemaMetaDetails.value.output]
            : updatedFileContent.value,
          decodeString(file.value.content),
        )
      : updatedFileContent.value.file,
    type: "string",
  };
  snackbar.value = await createAndUpdateFile(
    session.value,
    filePath,
    file.value.name,
    content,
    file.value.sha,
  );
  snackbar.value = {
    status: "success",
  };

  if (snackbar.value.status === "success") {
    if (
      typeof updatedFileContent.value !== "string" &&
      Object.keys(CUSTOM_EDITOR_INTERFACES).some(
        (key) => key in updatedFileContent.value,
      )
    ) {
      for (let key in CUSTOM_EDITOR_INTERFACES) {
        const interfaceObj = CUSTOM_EDITOR_INTERFACES[key];
        if (updatedFileContent.value[key] && interfaceObj.operation) {
          await interfaceObj.operation.save(
            updatedFileContent.value[key],
            fileContent.value[key],
            interfaceObj,
            filePath,
            updatedFileContent.value.title,
            session.value,
            { createAndUpdateFile, getFileDetails, stringifyIfNeeded },
          );
        }
      }
    }
    const loaderEle = document.getElementById("loader-text");
    loaderEle.innerText =
      "Loading updated file... (It might take a few seconds)";
    await updateFileDetails(false);
    initEOXJSONFormMethod(jsonFormInstance);
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
    customInterfaces,
    jsonFormInstance,
    updatedFileContent,
    debouncedPostMessage,
    updateNavButtonConfig,
  };

  jsonSchemaFileChangeMethod(props);
};

const resetContent = () => {
  jsonFormInstance.value.editor.setValue(fileContent.value);
  initEOXJSONFormMethod(jsonFormInstance);
  updateNavButtonConfig();
};

const togglePreview = () => {
  showPreview.value = !showPreview.value;
  previewExpanded.value = false;
};

onMounted(async () => {
  const loader = useLoader().show();
  updateNavButtonConfig();
  await updateFileDetails();
  if (file.value.encoding !== "none") {
    initEOXJSONFormMethod(jsonFormInstance);
    addPostMessageEventMethod({
      previewURL,
      updatedFileContent,
      jsonFormInstance,
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
    :togglePreview
    :showPreview
    :previewURL
  />

  <div
    v-if="fileContent !== null && schemaMetaDetails.schema"
    :class="`bg-white d-block file-editor ${schemaMetaDetails.generic && 'file-editor-code'}`"
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
    <v-row v-else no-gutters class="fill-height overflow-hidden split">
      <v-col
        cols="12"
        :md="previewURL ? (showPreview ? 6 : 12) : 12"
        :class="`fill-height overflow-x-auto overflow-y-scroll pa-4 pa-md-8 ${previewURL && previewExpanded ? 'd-none' : ''} ${$vuetify?.display?.smAndDown ? 'order-2' : 'order-1'}`"
      >
        <eox-jsonform
          :schema="schemaMetaDetails.schema"
          :value="updatedFileContent"
          :customEditorInterfaces="customInterfaces"
          @change="onFileChange"
          class="d-block fill-height"
        ></eox-jsonform>
      </v-col>
      <v-col
        v-if="previewURL"
        cols="12"
        :md="previewExpanded ? 12 : 6"
        :class="`file-preview fill-height position-relative ${showPreview ? '' : 'd-none'} ${$vuetify?.display?.smAndDown ? 'order-1' : 'order-2'}`"
      >
        <v-btn
          class="resize-btn position-absolute text-black elevation-1 d-md-block d-none"
          variant="flat"
          color="primary"
          :icon="previewExpanded ? 'mdi-arrow-collapse' : 'mdi-arrow-expand'"
          size="large"
          @click="previewExpanded = !previewExpanded"
        ></v-btn>
        <iframe v-if="previewURL" id="previewFrame" :src="previewURL"></iframe>
      </v-col>
    </v-row>
  </div>
</template>

<style>
.file-editor {
  --secondary-header-height: 80px;
  height: calc(100% - var(--secondary-header-height));
  position: relative;
}
.file-editor .split {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.file-preview iframe {
  box-sizing: border-box;
  border: 1px solid rgb(var(--v-theme-surface-light), 1);
  font: inherit;
  z-index: 0;
  word-wrap: break-word;
  width: 100%;
  height: 100%;
}
.file-preview .v-btn {
  top: 16px;
  right: 16px;
  color: black;
}
eox-jsonform {
  overflow-y: auto;
}
</style>
