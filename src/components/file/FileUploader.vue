<script setup>
import { inject, ref, watch } from "vue";
const emit = defineEmits(["changed"]);

const files = ref([]);
const fileInput = ref(null);
const uploadArea = ref(null);
const isDropping = ref(false);
const maxFileSize = 100 * 1024 * 1024; // 100MB

const snackbar = inject("set-snackbar");

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
        text: "Some files are too large. Maximum file size is 100 MB.",
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
</script>

<template>
  <v-card variant="flat" color="secondary" class="mx-auto">
    <v-card-text>
      <v-sheet
        ref="uploadArea"
        class="upload-area pa-6"
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
          <v-icon size="64" color="primary" icon="mdi-cloud-upload"></v-icon>

          <div class="text-h6 mt-4">Drag & Drop / Browse</div>

          <div class="text-caption text-grey">Supports: All file format.</div>
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
          :subtitle="`${(file.size / (1024 * 1024)).toFixed(2)} MB`"
          lines="three"
          prepend-icon="mdi-file"
        >
          <template v-slot:title>
            <v-text-field
              :model-value="file.newName || file.name"
              placeholder="File Name"
              density="compact"
              variant="underlined"
              hide-details
              class="w-25 pa-0 mb-2 bg-white"
              @update:model-value="(val) => file.newName = val"
            ></v-text-field>
          </template>

          <template v-slot:append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              density="comfortable"
              @click="removeFile(index)"
            ></v-btn>
          </template>
        </v-list-item>
      </v-list>

      <!-- Actions -->
      <v-card-actions v-if="files.length" class="mt-4">
        <v-spacer></v-spacer>
        <v-btn color="error" @click="clearAll"> Clear All </v-btn>
      </v-card-actions>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.v-card {
  background-color: #f6f6f6 !important;
}
.upload-area {
  border: 1px dashed rgb(var(--v-theme-primary));
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area.dropping {
  background-color: rgb(var(--v-theme-primary), 0.1);
  border-style: solid;
}

.upload-area:hover {
  background-color: rgb(var(--v-theme-secondary));
  cursor: pointer;
}
</style>
