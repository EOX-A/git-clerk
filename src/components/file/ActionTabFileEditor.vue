<script setup>
import {
  DeleteFile,
  RenameFile,
  PreviewBtn,
  Github,
} from "@/components/file/index.js";
import Tooltip from "@/components/global/Tooltip.vue";
import { defineProps } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  file: {
    type: Object,
    default: {},
  },
  reset: {
    type: Boolean,
    default: false,
  },
  resetContent: Function,
  togglePreview: Function,
  showPreview: Boolean,
  previewURL: String,
});
</script>

<template>
  <div
    class="bg-secondary px-0 px-sm-5 py-3 d-flex align-center ga-1 position-relative action-tab"
  >
    <Github :file="file" />
    <DeleteFile
      text="Delete File"
      size="x-large"
      :file="file"
      :session="session"
      :callBack="() => router.push(`/${session.number}`)"
    />
    <RenameFile text="Rename File" size="x-large" :file :session />
    <v-divider v-if="previewURL" inset vertical></v-divider>
    <PreviewBtn
      :togglePreview="togglePreview"
      :showPreview="showPreview"
      :previewURL="previewURL"
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
</template>
