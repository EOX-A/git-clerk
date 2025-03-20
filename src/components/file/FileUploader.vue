<script setup>
import { inject, ref, watch } from "vue";
import { createAndUpdateMultipleFiles } from "@/api";
import { CreateFile } from "@/components/file";
import { useLoader } from "@/helpers";
import OctIcon from "../global/OctIcon.vue";

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

const emit = defineEmits(["changed"]);

const files = ref([]);
const filePath = ref("");
const fileInput = ref(null);
const uploadArea = ref(null);
const isDropping = ref(false);
const maxFileSize = 25 * 1024 * 1024; // 25MB

const snackbar = inject("set-snackbar");
const navPaginationItems = inject("set-nav-pagination-items");

const onDragEnter = (e) => {
  e.preventDefault();
  isDropping.value = true;
};

const onDragLeave = (e) => {
  e.preventDefault();
  isDropping.value = false;
};

const onDrop = (e) => {
  e.preventDefault();
  isDropping.value = false;
  const droppedFiles = [...e.dataTransfer.files];
  validateAndAddFiles(droppedFiles);
};

const onFileInput = (e) => {
  const selectedFiles = [...e.target.files];
  validateAndAddFiles(selectedFiles);
};

const validateAndAddFiles = (newFiles) => {
  newFiles.forEach((file) => {
    if (file.size > maxFileSize) {
      snackbar.value = {
        text: "Some files are too large. Maximum file size is 25 MB.",
        status: "error",
      };
      return;
    }

    files.value.push(file);
  });
};

const removeFile = (index) => {
  files.value.splice(index, 1);
  if (files.value.length === 0) {
    resetFileInput();
  }
};

const clearAll = () => {
  files.value = [];
  resetFileInput();
};

const resetFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = ""; // Reset the file input value
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

watch(files.value, (newFiles) => {
  emit("changed", newFiles);
});

const fileUpload = async () => {
  const loader = useLoader().show();
  snackbar.value = await createAndUpdateMultipleFiles(
    props.session,
    filePath.value,
    files.value,
  );
  loader.hide();
  if (snackbar.value.status === "success") {
    props.close();
    props.updateDetails();
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
            <v-sheet
              ref="uploadArea"
              class="upload-area d-flex align-center justify-center"
              :class="{ dropping: isDropping }"
              rounded
              border
              @dragenter="onDragEnter"
              @dragleave="onDragLeave"
              @dragover.prevent
              @drop="onDrop"
              @click="triggerFileInput()"
            >
              <div class="text-center">
                <v-icon
                  size="64"
                  color="primary"
                  icon="mdi-cloud-upload"
                ></v-icon>

                <div class="text-h6 mt-4">Drag & Drop / Browse</div>

                <div class="text-caption text-grey">
                  Supports: All file format.
                </div>
              </div>

              <input
                ref="fileInput"
                type="file"
                hidden
                accept="*"
                multiple
                @change="onFileInput"
              />
            </v-sheet>

            <!-- File List -->
            <v-list v-if="files.length" class="mt-4">
              <v-list-item
                v-for="(file, index) in files"
                :key="index"
                :title="file.name"
                lines="three"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary">
                    <v-icon color="white">mdi-file-document</v-icon>
                  </v-avatar>
                </template>
                <template v-slot:title>
                  <v-text-field
                    :model-value="file.newName || file.name"
                    placeholder="File Name"
                    density="compact"
                    variant="underlined"
                    hide-details
                    class="pa-0 pr-4 mb-2 bg-white"
                    @update:model-value="(val) => (file.newName = val)"
                  ></v-text-field>
                </template>

                <template v-slot:append>
                  <div class="d-flex align-center ga-2">
                    <p class="text-body-2">
                      <strong
                        >{{ (file.size / (1024 * 1024)).toFixed(2) }} MB</strong
                      >
                    </p>
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      size="large"
                      density="comfortable"
                      color="error"
                      class="rounded-circle"
                      @click="removeFile(index)"
                    ></v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <!-- Actions -->
            <v-card-actions v-if="files.length" class="mt-4">
              <v-spacer></v-spacer>
              <v-btn
                class="text-capitalize font-weight-medium"
                color="error"
                @click="clearAll"
              >
                Clear All
              </v-btn>
              <v-btn
                class="text-capitalize font-weight-medium"
                color="primary"
                variant="flat"
                @click="fileUpload"
              >
                Upload Files
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.upload-area {
  border: 2px solid rgb(var(--v-theme-primary), 0.1);
  transition: all 0.3s ease;
  padding: 8rem;
}

.upload-area.dropping {
  background-color: rgb(var(--v-theme-primary), 0.1);
  border-style: solid;
}

.upload-area:hover {
  background-color: rgb(var(--v-theme-primary), 0.1);
  cursor: pointer;
}
</style>
