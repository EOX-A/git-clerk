<script setup>
import { inject, onMounted, ref } from "vue";
import {
  createAndUpdateFile,
  getFileDetails,
  getSessionDetails,
} from "@/api/index.js";
import { useRoute, useRouter } from "vue-router";
import { querySessionDetailsMethod } from "@/methods/session-view/index.js";
import { decodeString, isValidFormJSON, useLoader } from "@/helpers/index.js";
import queryFileDetailsMethod from "../methods/file-edit-view/query-file-details.js";
import { DeleteFile } from "@/components/file/index.js";
import isEqual from "lodash.isequal";
import "@eox/jsonform/dist/eox-jsonform.js";
import Tooltip from "@/components/global/Tooltip.vue";

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
  if (isFormJSON) {
    snackbar.value = await createAndUpdateFile(
      session.value,
      filePath,
      file.value.name,
      JSON.stringify(updatedFileContent.value, null, 2),
      file.value.sha,
    );

    if (snackbar.value.status === "success") {
      await updateFileDetails(false);
    }
  }
  loader.hide();
};

onMounted(async () => {
  updateNavButtonConfig();
  await updateFileDetails();
  jsonFormInstance.value = document.querySelector("eox-jsonform");

  // Ensure the element has an open shadow root
  const shadowRoot =
    jsonFormInstance.value.shadowRoot ||
    jsonFormInstance.value.attachShadow({ mode: "open" });

  // Create a <style> element
  const style = document.createElement("style");
  style.textContent = `
   .je-indented-panel .row {
    margin-top: 10px;
    padding: 10px;
  }
  .je-indented-panel > div > div {
    display: grid;
    grid-template-columns: 1fr 1fr; /* Two equal columns */
    gap: 20px 50px;
  }
  .row:has([style="display: none;"][data-schematype]) {
      display: none;
  }
  form[data-theme="html"] .je-indented-panel{
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .je-indented-panel .row {
    padding: 0 !important;
  }
`;

  // Append the <style> element to the shadow root
  shadowRoot.appendChild(style);
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

function updateSchemaDefaults(schema, formValues) {
  let properties = schema.allOf[0].properties;

  for (let key in formValues) {
    if (properties[key] && !properties[key]?.options?.hidden) {
      properties[key].default = formValues[key];
    }
  }

  schema.allOf[0].properties = properties;
  return schema;
}

const onChangeJSON = (e) => {
  if (e.detail) {
    const newSchema = updateSchemaDefaults(
      JSON.parse(fileContent.value),
      e.detail,
    );

    if (!updatedFileContent.value) {
      updatedFileContent.value = newSchema;
      fileContent.value = JSON.stringify(newSchema);
    } else if (!isEqual(updatedFileContent.value, newSchema)) {
      updatedFileContent.value = newSchema;
      updateNavButtonConfig("Save", false);
    } else updateNavButtonConfig();

    if (isEqual(updatedFileContent.value, JSON.parse(fileContent.value)))
      updateNavButtonConfig();
  }
};

const resetContent = () => {
  if (isFormJSON) {
    jsonFormInstance.value.editor.setValue({});
  }
};
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
      :callBack="() => router.push(`/${session.number}`)"
    />
    <v-spacer></v-spacer>
    <Tooltip text="Reset Content">
      <v-btn
        color="blue-grey-darken-4"
        icon="mdi-restart"
        size="large"
        variant="text"
        :disabled="reset"
        @click="resetContent"
      ></v-btn>
    </Tooltip>
  </div>

  <div v-if="fileContent" class="bg-white px-12 py-10 d-block">
    <h2>{{ session.title }}</h2>
    <p>{{ file.name }}</p>

    <eox-jsonform
      v-if="isFormJSON"
      :schema="JSON.parse(fileContent)"
      :noShadow="false"
      :unstyled="false"
      @change="onChangeJSON"
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
.je-indented-panel .row {
  margin-top: 10px;
  padding: 10px;
}
.je-indented-panel > div > div {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two equal columns */
  gap: 10px;
}
</style>
