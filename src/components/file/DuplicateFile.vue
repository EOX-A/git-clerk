<script setup>
import { onMounted, ref, watch, defineProps, inject } from "vue";
import { getBranchFileStructure } from "@/api/index.js";
import { encodeString } from "@/helpers/index.js";
import map from "lodash.map";
import { useRouter } from "vue-router";
import find from "lodash.find";
import { createFileMethod } from "@/methods/file-edit-view/index.js";

const router = useRouter();
const filePath = ref(null);
const fileContent = ref("");
const updatedFilePath = ref("/");
const updatedFilePathArr = ref([]);
const currPathDirStructure = ref([]);
const snackbar = inject("set-snackbar");

const props = defineProps({
  file: {
    type: Object,
    default: {},
  },
  session: {
    type: Object,
    default: {},
  },
  size: {
    type: String,
    default: "large",
  },
  text: {
    type: String,
    default: "",
  },
});

const duplicateFile = ref(false);

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
  } else if (event.key === "Enter") await createDuplicateFile();
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
    true,
  );
});

const close = () => {
  duplicateFile.value = false;

  filePath.value = null;
  fileContent.value = "";
  updatedFilePath.value = "/";
  updatedFilePathArr.value = [];
  currPathDirStructure.value = [];
};

const createDuplicateFile = async (sha = null) => {
  const success = () => {
    close();
  };
  const existingFile = find(currPathDirStructure.value, {
    name: filePath.value,
  });

  createFileMethod(
    updatedFilePath.value,
    filePath.value,
    props.session,
    null,
    router,
    snackbar,
    success,
    duplicateFile.value.title,
    existingFile?.sha,
  );
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
  <Tooltip text="Duplicate File">
    <v-btn
      color="primary"
      :icon="props.text ? false : 'mdi-content-copy'"
      :size="props.size"
      :text="props.text"
      variant="text"
      :disabled="props.file?.status === 'removed'"
      @click="duplicateFile = props.file"
    ></v-btn>
  </Tooltip>
  <div
    v-if="duplicateFile"
    class="position-absolute top-0 left-0 w-100 bg-grey-lighten-4 z-index"
  >
    <div class="d-flex justify-center border-b create-file">
      <v-row class="mr-0">
        <v-col cols="12" class="d-flex pr-0">
          <div
            class="px-6 py-4 border-b-thin session-create-field d-flex w-100 align-center justify-center ga-4"
          >
            <v-combobox
              v-model="filePath"
              @paste="onPastePathName"
              @keydown="onKeyDownPathName"
              label="File Name"
              placeholder="file.txt"
              :items="map(currPathDirStructure, 'name')"
              hide-details
              color="primary"
              variant="outlined"
            >
              <template #prepend-inner>
                <span
                  class="prepend text-mono font-weight-bold opacity-80 text-no-wrap"
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
                      class="d-flex align-center ga-2 text-sm-body-2 font-weight-bold"
                    >
                      <p>Edit File</p>
                      <v-icon>mdi-open-in-new</v-icon>
                    </div>
                  </template>
                </v-list-item>
              </template>
            </v-combobox>
            <div class="d-flex align-center ga-4">
              <v-btn
                prepend-icon="mdi-content-copy"
                color="primary"
                size="x-large"
                variant="flat"
                :disabled="!filePath"
                @click="createDuplicateFile"
              >
                Duplicate
              </v-btn>
              <v-btn variant="text" icon="mdi-close" @click="close"></v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
    </div>
  </div>
</template>
