<script setup>
import { onMounted, ref, watch, defineProps, inject, h } from "vue";
import {
  createAndUpdateFile,
  fetchSchemaFromURL,
  getBranchFileStructure,
} from "@/api/index.js";
import {
  encodeString,
  getSchemaDetails,
  stringifyIfNeeded,
  useLoader,
} from "@/helpers/index.js";
import map from "lodash.map";
import { useRouter } from "vue-router";
import find from "lodash.find";

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

const handleFilePathReset = (value = null) => {
  setTimeout(() => (filePath.value = value), 100);
};

const updateFilePath = (newPath) => {
  const normalizedPath = (updatedFilePath.value + newPath).replace(
    /\/\//g,
    "/",
  );
  const pathParts = normalizedPath.split("/");
  updatedFilePathArr.value =
    pathParts.length > 1 && !pathParts.at(-1)
      ? pathParts.slice(0, -1)
      : pathParts;
  updatedFilePath.value = normalizedPath;
};

const updateSchema = async () => {
  const fullPath = updatedFilePath.value + filePath.value;
  const schemaDetails = getSchemaDetails(fullPath);
  if (schemaDetails) {
    const loader = useLoader().show();

    const schema =
      schemaDetails.schema || (await fetchSchemaFromURL(schemaDetails.url));

    if (schema.status === "error") {
      snackbar.value = schema;
      loader.hide();
    } else {
      const jsonForm = document.createElement("eox-jsonform");
      jsonForm.style.display = "none";
      jsonForm.schema = schema;
      document.body.appendChild(jsonForm);

      const intervalId = setInterval(() => {
        if (jsonForm.editor) {
          fileContent.value = stringifyIfNeeded(
            schemaDetails.content || jsonForm.editor.getValue(),
          );
          createFile();

          clearInterval(intervalId);
          jsonForm.remove();
          loader.hide();
        }
      }, 500);
    }
  } else await createFile();
};

const onKeyDownPathName = async (event) => {
  const { key } = event;

  if (event.key === "Escape") close();
  else if (key === "/") {
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
  }
};

const onPastePathName = (event) => {
  const pasteValue = event.clipboardData.getData("text");
  if (!pasteValue.includes("/")) return;

  const finalValue = pasteValue.replace(/^\//, "");
  if (!finalValue) return;

  const pathParts = finalValue.split("/");
  const fileName = pathParts[pathParts.length - 1] || null;
  const filePath = fileName
    ? pathParts.slice(0, -1).join("/") + "/"
    : finalValue;

  updateFilePath(filePath);
  handleFilePathReset(fileName);
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

const getSelectedFileFolder = (name) => {
  return find(currPathDirStructure.value, { name });
};
</script>

<template>
  <div v-if="props.open" class="d-flex justify-center border-b create-file">
    <v-row>
      <v-col cols="12" class="d-flex">
        <div
          class="px-6 py-6 border-b-thin session-create-field d-flex w-100 align-center justify-center"
        >
          <v-combobox
            v-model="filePath"
            @paste="onPastePathName"
            @keydown="onKeyDownPathName"
            label="File Name"
            placeholder="my/new/file.txt"
            :items="map(currPathDirStructure, 'name')"
            hide-details
            color="primary"
            variant="outlined"
          >
            <template #prepend-inner>
              <span
                class="prepend text-mono font-weight-bold text-primary opacity-80"
                >(root){{ updatedFilePath }}</span
              >
            </template>
            <template v-slot:item="{ props, item, index }">
              <v-list-item
                :prepend-icon="`mdi-${getSelectedFileFolder(item.raw).icon}-outline`"
                v-bind="props"
                :title="item.raw"
                @click="() => onSelectFile(getSelectedFileFolder(item.raw))"
              >
                <template
                  v-if="getSelectedFileFolder(item.raw).type === 'file'"
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
          <v-btn
            @click="updateSchema"
            icon="mdi-plus"
            variant="flat"
            color="primary"
            size="large"
          ></v-btn>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style>
.create-file
  .v-input--density-default.v-input--plain-underlined
  .v-input__prepend,
.create-file .v-field__input {
  padding: 0px;
  margin: 0;
}
.create-file button {
  border-radius: 6px;
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
  padding: 0px;
}
.create-file .v-combobox .v-field__input input::placeholder {
  /* color: grey;
  opacity: 0.5;
  font-weight: 800; */
  font-family: monospace;
}
/* Same as SessionsView.vue */
/* TODO refactor */
.session-create-field {
  border-bottom: 1px solid #647078;
}

.session-create-field .v-field {
  border-radius: 6px 0px 0px 6px;
}

.session-create-field button {
  border-radius: 0px 6px 6px 0px;
}

.session-create-field .v-label {
  color: #6c757d;
}

.session-create-field .v-field__input {
  padding-top: 10px;
  padding-bottom: 10px;
  color: #000000;
}

.session-create-field .v-field__append-inner .v-icon {
  color: #6c757d;
  cursor: pointer;
}

.session-create-field.v-text-field--outline {
  background-color: white;
  border-color: #d9d9d9;
  box-shadow: none;
}

.session-create-field .v-field__outline {
  border-color: transparent;
}
</style>
