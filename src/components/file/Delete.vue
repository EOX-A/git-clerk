<script setup>
import Tooltip from "@/components/global/Tooltip.vue";
import { defineProps, inject, ref } from "vue";
import { useLoader } from "@/helpers/index.js";
import { deleteFileBySHA } from "@/api/index.js";

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
  callBack: Function,
});

const deleteFile = ref(false);
const snackbar = inject("set-snackbar");

const deleteFileHandle = async () => {
  if (deleteFile.value) {
    const loader = useLoader().show();
    const owner = props.session.head.repo.owner.login;
    const repo = props.session.head.repo.name;
    const path = deleteFile.value.title || deleteFile.value.path;
    const message = `Deleting ${path} file from the pull request`;
    const sha = deleteFile.value.sha;
    const ref = props.session.head.ref;

    snackbar.value = await deleteFileBySHA(
      owner,
      repo,
      path,
      message,
      sha,
      ref,
    );

    deleteFile.value = false;
    loader.hide();

    if (snackbar.value.status === "success") await props.callBack();
  }
};
</script>

<template>
  <Tooltip text="Delete File">
    <v-btn
      color="blue-grey-darken-4"
      prepend-icon="mdi-delete-outline"
      :icon="props.text ? false : 'mdi-delete-outline'"
      :size="props.size"
      :text="props.text"
      variant="text"
      :disabled="props.file?.status === 'removed'"
      @click="deleteFile = props.file"
    ></v-btn>
  </Tooltip>

  <v-dialog v-model="deleteFile" width="auto">
    <v-card max-width="400" prepend-icon="mdi-alert" title="Delete File">
      <template v-slot:text>
        <p class="mt-8">
          Are you sure you want to delete the file:
          <strong>{{ deleteFile.title }}</strong>
        </p>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn size="large" @click="deleteFile = false"> Cancel </v-btn>
        <v-btn
          size="large"
          color="red"
          variant="flat"
          @click="deleteFileHandle"
        >
          Delete
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>
