<script setup>
import { Actions } from "./";
import { getBranchFileStructure, getRepoDetails } from "@/api/index.js";
import { ref, onMounted, watch, inject } from "vue";
import useOctokitStore from "@/stores/octokit";
import { preventListItemClick } from "@/helpers/index.js";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import { EditFile, AddFile, UploadFiles } from "./";

const fileBrowserDrawer = inject("set-file-browser-drawer");

const updatedFilePath = ref("/");
const updatedFilePathArr = ref([]);
const currPathDirStructure = ref([]);
const repoDetails = ref(null);
const hover = ref(null);
const updateInNewSession = ref(false);

const selectedOperation = ref(null);
const { githubConfig } = useOctokitStore();

const props = defineProps({
  session: {
    type: Object,
    default: null,
  },
  updateDetails: {
    type: Function,
    default: () => {},
  },
});

onMounted(async () => {
  if (props.session) {
    repoDetails.value = props.session;
  } else {
    const details = (await getRepoDetails()) || {};
    repoDetails.value = {
      head: {
        ref: null,
        repo: {
          owner: {
            login: details?.owner?.login || githubConfig.username,
          },
          name: details?.name || githubConfig.repo,
        },
      },
    };
    updateInNewSession.value = true;
  }
  updatedFilePathArr.value = [""];
});

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

const goToPath = (index) => {
  updatedFilePathArr.value = updatedFilePathArr.value.slice(0, index + 1);
  updatedFilePath.value = updatedFilePathArr.value.join("/") + "/";
};

const onSelect = (item) => {
  if (item.type === "dir") {
    if (item.name === "...") {
      goToPath(updatedFilePathArr.value.length - 2);
    } else {
      updateFilePath(`${item.name}/`);
    }
  } else {
    selectedOperation.value = {
      type: "edit",
      meta: item,
    };
  }
};

const resetOperation = (fullReset = true) => {
  selectedOperation.value = null;
  if (fullReset) {
    updatedFilePath.value = "/";
    updatedFilePathArr.value = [];
    currPathDirStructure.value = [];
    repoDetails.value = null;
  }
};

const fetchDirStructure = async (pathArr) => {
  if (!repoDetails.value) return;
  currPathDirStructure.value = [];
  const currPath = pathArr.join("/").replace("/", "");

  const data = await getBranchFileStructure(repoDetails.value, currPath, false);
  currPathDirStructure.value =
    updatedFilePathArr.value.length > 1
      ? [
          {
            name: "...",
            type: "dir",
            size: 0,
          },
          ...data,
        ]
      : data;
};

watch(updatedFilePathArr, async (newPathArr) => {
  await fetchDirStructure(newPathArr);
});

watch(fileBrowserDrawer, async (newFileBrowserDrawer) => {
  await fetchDirStructure(updatedFilePathArr.value);
});

const handleOperation = (operation) => {
  selectedOperation.value = {
    type: operation,
    meta: null,
  };
};
</script>
<template>
  <Actions
    :handleOperation="handleOperation"
    :updatedFilePathArr="updatedFilePathArr"
    :goToPath="goToPath"
  />
  <v-list class="py-0">
    <!-- file's list -->
    <v-list-item
      v-if="currPathDirStructure && currPathDirStructure.length"
      v-for="(item, index) in currPathDirStructure"
      :key="item.name"
      :title="item.name"
      class="files-view py-4 border-b-thin"
      @mouseenter="hover = index"
      @mouseleave="hover = null"
      @click.native.capture="preventListItemClick"
      @click="onSelect(item)"
    >
      <template v-slot:title>
        <div
          :class="{ 'ml-6': updatedFilePathArr.length > 1 && index }"
          class="d-flex align-start px-5"
        >
          <v-icon
            color="blue"
            :icon="item.type === 'dir' ? 'mdi-folder-open' : 'mdi-file-outline'"
            class="file-icon opacity-100"
          >
          </v-icon>
          <div class="ml-4">
            <div class="d-flex align-center ga-3">
              <div
                class="main-title file-folder-title text-black"
                :class="{
                  'font-weight-bold': hover === index,
                }"
              >
                {{ item.name }}
                <v-chip
                  v-if="item.icon === 'file'"
                  class="ml-2 font-weight-bold rounded-pill"
                  size="x-small"
                  color="primary"
                >
                  {{ (item.size / 1024).toFixed(1) }}kb
                </v-chip>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-list-item>
    <ListPlaceholder
      :avatar="false"
      :subTitle="false"
      :button="0"
      v-else-if="currPathDirStructure.length === 0"
    />
    <v-dialog
      v-model="selectedOperation"
      @update:modelValue="updateInNewSession = session ? false : true"
      width="auto"
      style="z-index: 999999"
    >
      <EditFile
        v-if="selectedOperation && selectedOperation.type === 'edit'"
        :updatedFilePath="updatedFilePath"
        :selectedOperation="selectedOperation"
        :session="session"
        :resetOperation="resetOperation"
      />
      <AddFile
        v-if="selectedOperation && selectedOperation.type === 'add'"
        :updatedFilePath="updatedFilePath"
        :selectedOperation="selectedOperation"
        :session="session"
        :repoDetails="repoDetails"
        :resetOperation="resetOperation"
      />
      <UploadFiles
        v-if="selectedOperation && selectedOperation.type === 'upload'"
        :updatedFilePath="updatedFilePath"
        :selectedOperation="selectedOperation"
        :session="session"
        :repoDetails="repoDetails"
        :updateDetails="updateDetails"
        :resetOperation="resetOperation"
      />
    </v-dialog>
  </v-list>
</template>

<style>
.v-card-actions {
  justify-content: center !important;
}
</style>
