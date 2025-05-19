<script setup>
import { ref } from "vue";
import { CreateFile } from "@/components/file";
import { UploadArea } from "./";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  close: {
    type: Function,
    default: () => {},
  },
  session: {
    type: Object,
    default: {},
  },
  updateDetails: {
    type: Function,
  },
});

const filePath = ref("");
</script>

<template>
  <v-dialog
    v-model="props.open"
    transition="dialog-bottom-transition"
    fullscreen
    class="create-file"
  >
    <v-card class="bg-surface-light">
      <v-toolbar color="primary">
        <v-toolbar-title class="text-white">Upload Files</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          class="rounded-circle"
          color="white"
          @click="props.close"
        ></v-btn>
      </v-toolbar>
      <v-container class="pa-6">
        <v-card variant="flat" class="mx-auto bg-surface-light">
          <v-card-text>
            <p class="d-flex align-center ga-1 text-capitalize text-primary">
              <strong>Session:</strong> {{ props.session.title }}
            </p>
            <CreateFile
              :session="props.session"
              :open="true"
              :pathSelector="true"
              @changed="(newFilePath) => (filePath = newFilePath)"
            />
            <UploadArea
              :session="props.session"
              :close="props.close"
              :updateDetails="props.updateDetails"
              :filePath="filePath"
            />
          </v-card-text>
        </v-card>
      </v-container>
    </v-card>
  </v-dialog>
</template>
