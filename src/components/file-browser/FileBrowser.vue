<script setup>
import { Actions } from "./";
import { getBranchFileStructure, getRepoDetails } from "@/api/index.js";
import { ref, onMounted, watch, inject } from "vue";
import useOctokitStore from "@/stores/octokit";
import { preventListItemClick, encodeString } from "@/helpers/index.js";
import { useRouter } from "vue-router";
import ListPlaceholder from "@/components/global/ListPlaceholder.vue";
import CreateSession from "@/components/session/CreateSession.vue";

const router = useRouter();
const fileBrowserDrawer = inject("set-file-browser-drawer");

const updatedFilePath = ref("/");
const updatedFilePathArr = ref([]);
const currPathDirStructure = ref([]);
const repoDetails = ref(null);
const hover = ref(null);
const editFile = ref(null);
const editInNewSession = ref(false);
const { githubConfig, octokit, githubUserData } = useOctokitStore();

const props = defineProps({
  session: {
    type: Object,
    default: null,
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
    editInNewSession.value = true;
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

const filePath = () => {
  return encodeString(
    (updatedFilePath.value + editFile.value.name).replace("/", ""),
  );
};

const redirectToFileEdit = () => {
  router.push(`/${props.session.number}/${filePath()}`);
  fileBrowserDrawer.value = false;
};

const onSelect = (item) => {
  if (item.type === "dir") {
    if (item.name === "...") {
      goToPath(updatedFilePathArr.value.length - 2);
    } else {
      updateFilePath(`${item.name}/`);
    }
  } else {
    editFile.value = item;
  }
};

const clearInput = () => {
  fileBrowserDrawer.value = false;
};

watch(updatedFilePathArr, async (newPathArr) => {
  currPathDirStructure.value = [];
  const currPath = newPathArr.join("/").replace("/", "");

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
});
</script>
<template>
  <Actions :updatedFilePathArr="updatedFilePathArr" :goToPath="goToPath" />
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
                class="main-title text-black"
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
      v-model="editFile"
      @update:modelValue="editInNewSession = session ? false : true"
      width="auto"
      style="z-index: 999999"
    >
      <v-card max-width="400" prepend-icon="mdi-pencil" title="Edit File">
        <template v-slot:text>
          <div v-if="editInNewSession">
            <p class="py-6">
              Create a new session to edit <strong>{{ editFile.name }}</strong
              >. Please provide a name for the new session.
            </p>
            <CreateSession
              :createNewSession="editInNewSession"
              :fromFileBrowser="true"
              :filePath="filePath"
              :clearInput="clearInput"
            />
          </div>
          <div v-else>
            <p class="py-6">
              Do you want to edit <strong>{{ editFile.name }}</strong> in a
              <strong>new session</strong> or <strong>current session</strong>?
            </p>
            <div class="d-flex align-center justify-center ga-3">
              <v-btn size="large" variant="tonal" @click="redirectToFileEdit">
                Current Session
              </v-btn>
              <v-btn
                size="large"
                color="primary"
                variant="flat"
                @click="editInNewSession = true"
              >
                New Session
              </v-btn>
            </div>
          </div>
        </template>
      </v-card>
    </v-dialog>
  </v-list>
</template>

<style>
.v-card-actions {
  justify-content: center !important;
}
</style>
