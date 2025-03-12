<script setup>
import { onMounted, ref, watch, defineProps, inject, h } from "vue";
import {
  createAndUpdateFile,
  fetchSchemaFromURL,
  getBranchFileStructure,
  getFileDetails,
} from "@/api/index.js";
import {
  decodeString,
  encodeString,
  getSchemaDetails,
  stringifyIfNeeded,
  useLoader,
} from "@/helpers/index.js";
import map from "lodash.map";
import { useRouter } from "vue-router";
import find from "lodash.find";

const emit = defineEmits(["changed"]);

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
  pathSelector: {
    type: Boolean,
    default: false,
  },
  duplicateFile: {
    type: Object,
    default: null,
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

const addOrEditFile = async () => {
  const existingFile = find(currPathDirStructure.value, {
    name: filePath.value,
  });

  if (props.duplicateFile) {
    const loader = useLoader().show();
    const fileDetails = await getFileDetails(
      props.session,
      props.duplicateFile.title,
      false,
    );
    fileContent.value = decodeString(fileDetails.content);
    if (fileDetails.encoding !== "none") {
      createFile(existingFile?.sha);
    } else {
      snackbar.value = {
        text: "File is large and cannot be duplicated by Git Clerk",
        status: "error",
      };
    }
    loader.hide();
  } else if (existingFile) {
    onSelectFile(existingFile);
  } else {
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
  }
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
  } else if (event.key === "Enter") await addOrEditFile();
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
    props.duplicateFile ? true : false,
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

const createFile = async (sha = null) => {
  if (!filePath.value) {
    snackbar.value = {
      text: "Please add a filename",
      status: "error",
    };
    return;
  }
  const loader = useLoader().show();

  const fullFilePath = (updatedFilePath.value + (filePath.value || "")).replace(
    "/",
    "",
  );

  const content = {
    data: fileContent.value,
    type: "string",
  };

  snackbar.value = await createAndUpdateFile(
    props.session,
    fullFilePath,
    filePath.value,
    content,
    sha,
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

watch([filePath, updatedFilePath], ([newFilePath, newUpdatedFilePath]) => {
  const fullFilePath = (newUpdatedFilePath + (newFilePath || "")).replace(
    "/",
    "",
  );

  emit("changed", fullFilePath);
});
</script>

<template>
  <div
    v-if="props.open"
    :class="`d-flex justify-center ${props.pathSelector ? '' : 'border-b'} create-file`"
  >
    <v-row class="mr-0">
      <v-col cols="12" class="d-flex pr-0">
        <div
          :class="`${props.pathSelector ? 'px-0 py-3 path-selector' : props.duplicateFile ? 'px-6 py-4 border-b-thin' : 'px-6 py-6 border-b-thin'} session-create-field d-flex w-100 align-center justify-center ga-4`"
        >
          <v-combobox
            v-model="filePath"
            @paste="onPastePathName"
            @keydown="onKeyDownPathName"
            :label="props.pathSelector ? 'File Path' : 'File Name'"
            :placeholder="props.pathSelector ? 'my/new/path/' : 'file.txt'"
            :items="map(currPathDirStructure, 'name')"
            hide-details
            color="primary"
            variant="outlined"
          >
            <template #prepend-inner>
              <span
                class="prepend text-mono font-weight-bold text-primary opacity-80 text-no-wrap"
                >(root){{ updatedFilePath }}</span
              >
            </template>
            <template v-slot:item="{ props, item }">
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
                    class="text-primary d-flex align-center ga-2 text-sm-body-2 font-weight-bold"
                  >
                    <p>Edit File</p>
                    <v-icon>mdi-open-in-new</v-icon>
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-combobox>
          <div v-if="!props.pathSelector" class="d-flex align-center ga-4">
            <v-btn
              :prepend-icon="
                props.duplicateFile ? 'mdi-content-copy' : 'mdi-plus'
              "
              color="primary"
              size="x-large"
              variant="flat"
              @click="addOrEditFile"
            >
              {{ props.duplicateFile ? "Duplicate" : "Create" }}
            </v-btn>
            <v-btn variant="text" icon="mdi-close" @click="close"></v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style></style>
