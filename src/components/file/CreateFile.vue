<script setup>
import { onMounted, ref, watch, defineProps, inject, h } from "vue";
import {
  createAndUpdateFile,
  fetchSchemaFromURL,
  getBranchFileStructure,
} from "@/api/index.js";
import { encodeString, getSchemaDetails, useLoader } from "@/helpers/index.js";
import map from "lodash.map";
import { useRouter } from "vue-router";

const router = useRouter();

const filePath = ref(null);
const fileContent = ref("");
const updatedFilePath = ref("/");
const updatedFilePathArr = ref([]);
const currPathDirStructure = ref([]);
const snackbar = inject("set-snackbar");

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  open: {
    type: Boolean,
    default: false,
  },
  addNewFileClick: Function,
  updateDetails: Function,
});

const handleFilePathReset = () => {
  setTimeout(() => (filePath.value = null), 100);
};

const updateFilePath = (newPath) => {
  const path = (updatedFilePath.value + newPath).replace(/\/\//g, "/");
  updatedFilePathArr.value = path.split("/").slice(0, -1);
  updatedFilePath.value = path;
};

const updateSchema = async () => {
  const fullPath = updatedFilePath.value + filePath.value;
  const schemaDetails = getSchemaDetails(fullPath);
  if (schemaDetails) {
    const loader = useLoader().show(
      {},
      {
        after: h(
          "h5",
          { class: "loader-text", id: "loader-text" },
          `Fetching schema for - ${filePath.value}`,
        ),
      },
    );

    const data =
      schemaDetails.schema || (await fetchSchemaFromURL(schemaDetails.url));
    loader.hide();

    if (data.status === "error") snackbar.value = data;
    else {
      fileContent.value = JSON.stringify(data, "", 2);
      await createFile();
    }
  }
};

const onKeyDownPathName = async (event) => {
  const { key } = event;

  if (key === "/") {
    if (!filePath.value) {
      handleFilePathReset();
    } else {
      updateFilePath(`${filePath.value}/`);
      handleFilePathReset();
    }
  } else if (key === "Backspace") {
    if (!filePath.value) {
      const lastPath =
        updatedFilePathArr.value[updatedFilePathArr.value.length - 1];

      if (lastPath !== "") {
        setTimeout(() => (filePath.value = lastPath), 100);
        updatedFilePathArr.value = updatedFilePathArr.value.slice(0, -1);
        updatedFilePath.value = updatedFilePathArr.value.join("/") + "/";
      }
    }
  } else {
    setTimeout(updateSchema, 100);
  }
};

const onPastePathName = (event) => {
  const pasteValue = event.clipboardData.getData("text");
  if (pasteValue.startsWith("/")) {
    const finalValue = pasteValue.slice(1); // removes the leading "/"
    if (finalValue) {
      const path = finalValue + (!pasteValue.endsWith("/") ? "/" : "");
      updateFilePath(path);
    }
    handleFilePathReset();
  }
};

onMounted(() => {
  updatedFilePathArr.value = [""];
});

watch(updatedFilePathArr, async (newPathArr) => {
  currPathDirStructure.value = [];
  const currPath = newPathArr.join("/").replace("/", "");

  currPathDirStructure.value = await getBranchFileStructure(
    props.session,
    currPath,
  );
});

const close = () => {
  props.addNewFileClick(false);

  filePath.value = null;
  fileContent.value = "";
  updatedFilePath.value = "/";
  updatedFilePathArr.value = [];
  currPathDirStructure.value = [];
};

const createFile = async () => {
  if (!filePath.value) {
    snackbar.value = {
      text: "Please add a filename",
      status: "error",
    };
    return;
  }
  const loader = useLoader().show();

  const fullFilePath = (updatedFilePath.value + filePath.value).replace(
    "/",
    "",
  );

  snackbar.value = await createAndUpdateFile(
    props.session,
    fullFilePath,
    filePath.value,
    fileContent.value,
  );
  if (snackbar.value.status === "success") {
    await router.push(`/${props.session.number}/${encodeString(fullFilePath)}`);
    close();
    props.updateDetails();
  }
  loader.hide();
};

const onSelectFile = (item) => {
  if (item.type === "file") {
    const encodedFilePath = encodeString(
      (updatedFilePath.value + item.name).replace("/", ""),
    );
    router.push(`/${props.session.number}/${encodedFilePath}`);
  }
};
</script>

<template>
  <v-dialog
    v-model="props.open"
    transition="dialog-bottom-transition"
    fullscreen
    class="create-file"
  >
    <v-card>
      <v-toolbar color="primary">
        <v-btn icon="mdi-close" @click="close"></v-btn>

        <v-toolbar-title>Add New File</v-toolbar-title>

        <v-spacer></v-spacer>

        <v-toolbar-items>
          <v-btn text="Create" @click="createFile"></v-btn>
        </v-toolbar-items>
      </v-toolbar>
      <div>
        <v-row>
          <v-col>
            <v-combobox
              v-model="filePath"
              @paste="onPastePathName"
              @keydown="onKeyDownPathName"
              variant="plain"
              placeholder="Enter filename along with path"
              :items="map(currPathDirStructure, 'name')"
              hide-details
              color="primary"
              class="border-b-thin text-mono"
            >
              <template #prepend>
                <span
                  class="prepend text-mono font-weight-bold text-primary opacity-80"
                  >(root){{ updatedFilePath }}</span
                >
              </template>
              <template v-slot:item="{ props, item, index }">
                <v-list-item
                  :prepend-icon="`mdi-${currPathDirStructure[index].icon}-outline`"
                  v-bind="props"
                  :title="item.raw"
                  @click="() => onSelectFile(currPathDirStructure[index])"
                >
                  <template
                    v-if="currPathDirStructure[index].type === 'file'"
                    v-slot:append
                  >
                    <div
                      class="text-blue-accent-4 d-flex align-center ga-2 text-sm-body-2 font-weight-bold"
                    >
                      <p class="text-uppercase">Edit File</p>
                      <v-icon>mdi-open-in-new</v-icon>
                    </div>
                  </template>
                </v-list-item>
              </template>
            </v-combobox>
          </v-col>
        </v-row>
      </div>
      <div class="pa-6">
        <v-textarea
          v-model="fileContent"
          class="bg-white text-mono"
          placeholder="Enter file content here"
          variant="plain"
        ></v-textarea>
      </div>
    </v-card>
  </v-dialog>
</template>

<style>
.create-file
  .v-input--density-default.v-input--plain-underlined
  .v-input__prepend,
.create-file .v-field__input {
  padding: 0px;
  margin: 0;
}
.create-file
  .v-input--density-default.v-input--plain-underlined
  .v-input__prepend {
  min-height: max(
    var(--v-input-control-height, 56px),
    1.5rem + var(--v-field-input-padding-top) +
      var(--v-field-input-padding-bottom)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: 10px;
}
.create-file .v-field__append-inner {
  display: none !important;
}
.create-file .v-input {
  background: #f6f6f6;
  padding: 6px 0px;
}
.create-file .v-combobox .v-field__input input::placeholder {
  color: grey;
  opacity: 0.5;
  font-weight: 800;
}
.create-file textarea.v-field__input {
  all: unset;
}
.create-file textarea.v-field__input {
  font-family: "Courier New", monospace;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  padding: 12px;
  tab-size: 2;
  background-color: #ffffff;
  color: #000000;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  width: 100%;
  height: calc(100vh - 230px) !important;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
  resize: none;
}
.create-file textarea.v-field__input:focus {
  outline: none;
}
.create-file textarea.v-field__input {
  background-image: linear-gradient(to right, #f5f5f5 30px, #ffffff 30px);
  background-size: 100% 24px;
  background-repeat: repeat-y;
  padding-left: 45px;
}
</style>
