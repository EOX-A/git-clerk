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
import ActionTab from "@/components/global/ActionTab.vue";
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
  contentHistory: {
    type: Array,
    default: [],
  },
  contentHistoryIndex: {
    type: Number,
    default: 0,
  },
  undoContent: Function,
  redoContent: Function,
  resetContent: Function,
  togglePreview: Function,
  showPreview: Boolean,
  previewURL: String,
});
</script>

<template>
  <ActionTab>
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
    <Tooltip text="Undo ((Ctrl | Cmd) + Z)">
      <v-btn
        color="blue-grey-darken-4"
        icon="mdi-undo-variant"
        size="large"
        variant="text"
        :disabled="contentHistoryIndex === 0"
        @click="undoContent"
      ></v-btn>
    </Tooltip>
    <Tooltip text="Redo ((Ctrl | Cmd) + Shift + Z / Y)">
      <v-btn
        color="blue-grey-darken-4"
        icon="mdi-redo-variant"
        size="large"
        variant="text"
        :disabled="contentHistoryIndex === contentHistory.length - 1"
        @click="redoContent"
      ></v-btn>
    </Tooltip>
    <v-divider inset vertical class="mx-2"></v-divider>
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
  </ActionTab>
</template>
