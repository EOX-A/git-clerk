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

defineProps({
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
  <ActionTab>
    <Github :file="file" />
    <DeleteFile
      text="Delete File"
      size="x-large"
      :file="file"
      :session="session"
      :call-back="() => router.push(`/${session.number}`)"
    />
    <RenameFile text="Rename File" size="x-large" :file :session />
    <v-divider v-if="previewURL" inset vertical></v-divider>
    <PreviewBtn
      :toggle-preview="togglePreview"
      :show-preview="showPreview"
      :preview-u-r-l="previewURL"
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
  </ActionTab>
</template>
