<script setup>
import { defineProps, inject, ref } from "vue";
import { encodeString, useLoader } from "@/helpers/index.js";
import { createAndUpdateFile, deleteFileBySHA } from "@/api/index.js";

import { useRouter } from "vue-router";

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
    default: "Rename File",
  },
});
const snackbar = inject("set-snackbar");
const router = useRouter();

const renameFile = ref(null);
const renameFileTitle = ref(props.file.name);
const confirmRename = ref(false);

const renameFileHandle = async () => {
  if (renameFile.value) {
    const loader = useLoader().show();
    let newPathArr = renameFile.value.path.split("/");
    newPathArr[newPathArr.length - 1] = renameFileTitle.value;
    const newPath = newPathArr.join("/");

    const owner = props.session.head.repo.owner.login;
    const repo = props.session.head.repo.name;
    const path = renameFile.value.title || renameFile.value.path;

    const resp = await deleteFileBySHA(
      owner,
      repo,
      path,
      `Deleting ${path} file from the pull request`,
      renameFile.value.sha,
      props.session.head.ref,
    );

    if (resp.status === "success") {
      const content = {
        data: renameFile.value.content,
        type: "base64",
      };
      snackbar.value = await createAndUpdateFile(
        props.session,
        newPath,
        renameFileTitle.value,
        content,
      );
      loader.hide();
      renameFile.value = false;
      confirmRename.value = false;

      if (snackbar.value.status === "success") {
        router.push(`/${props.session.number}/${encodeString(newPath)}`);
      }
    }
  }
};

const closeRename = () => {
  renameFile.value = null;
  confirmRename.value = false;
  renameFileTitle.value = props.file.name;
};
</script>

<template>
  <!-- Mobile -->
  <v-btn
    color="primary"
    icon="mdi-pencil-outline"
    :size="size"
    variant="text"
    class="d-flex d-sm-none"
    @click="renameFile = props.file"
  ></v-btn>
  <!-- Non-mobile -->
  <v-btn
    id="rename-file-btn"
    color="blue-grey-darken-4"
    prepend-icon="mdi-pencil-outline"
    :size="size"
    :text="text"
    variant="text"
    class="text-capitalize font-weight-medium d-none d-sm-flex"
    @click="renameFile = props.file"
  ></v-btn>

  <div
    v-if="renameFile"
    class="position-absolute left-0 rename-file-container px-6 py-3 bg-white d-flex justify-space-between align-center ga-4"
  >
    <v-text-field
      v-model="renameFileTitle"
      label="Rename File"
      hide-details
      variant="outlined"
      :append-inner-icon="
        renameFileTitle !== props.file.name ? 'mdi-restart' : undefined
      "
      @click:append-inner="renameFileTitle = props.file.name"
      @keyup.enter="confirmRename = true"
    ></v-text-field>
    <v-btn
      :disabled="renameFileTitle === props.file.name"
      prepend-icon="mdi-pencil-outline"
      color="primary"
      size="x-large"
      variant="flat"
      class="text-capitalize"
      @click="confirmRename = true"
    >
      Rename
    </v-btn>
    <v-btn
      variant="text"
      icon="mdi-close"
      class="px-1 rounded-circle"
      @click="closeRename"
    ></v-btn>
  </div>

  <v-dialog v-model="confirmRename" width="auto">
    <v-card max-width="400" prepend-icon="mdi-alert" title="Rename Session">
      <template #text>
        <p class="mt-8">
          Are you sure you want to rename the file to
          <strong>{{ renameFileTitle }}</strong
          >?
        </p>
      </template>
      <template #actions>
        <v-spacer></v-spacer>
        <v-btn
          class="text-capitalize font-weight-medium"
          size="large"
          variant="text"
          @click="confirmRename = false"
        >
          Cancel
        </v-btn>
        <v-btn
          class="text-capitalize font-weight-medium"
          size="large"
          color="success"
          variant="flat"
          @click="renameFileHandle"
        >
          Rename
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<style>
.rename-file-container .v-input__details {
  display: none;
}
.rename-file-container {
  width: 100%;
  bottom: -100% !important;
  z-index: 99;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
}
</style>
