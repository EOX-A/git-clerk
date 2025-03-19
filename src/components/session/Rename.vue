<script setup>
import { defineProps, inject, ref } from "vue";
import { useLoader } from "@/helpers/index.js";
import { renameBySessionNumber } from "@/api/index.js";

const props = defineProps({
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
    default: "Rename Session",
  },
  tab: {
    type: Boolean,
    default: false,
  },
  callBack: Function,
});
const snackbar = inject("set-snackbar");
const renameSession = ref(false);
const renameSessionTitle = ref(props.session.title);
const confirmRename = ref(false);
const disabled = props.session.state === "closed";

const renameSessionHandle = async () => {
  if (renameSession.value) {
    const loader = useLoader().show();
    snackbar.value = await renameBySessionNumber(
      renameSession.value.number,
      renameSessionTitle.value,
    );
    loader.hide();
    renameSession.value = false;
    confirmRename.value = false;
    if (snackbar.value.status === "success") {
      await props.callBack();
      closeRename();
    }
  }
};

const closeRename = () => {
  renameSession.value = false;
  confirmRename.value = false;
  renameSessionTitle.value = props.session.title;
};
</script>

<template>
  <!-- Tab = true -->
  <!-- Mobile -->
  <v-btn
    v-if="tab"
    color="blue-grey-darken-4"
    icon="mdi-pencil-outline"
    :size="size"
    variant="text"
    :disabled="disabled"
    @click="renameSession = session"
    class="d-flex d-sm-none"
  ></v-btn>
  <!-- Non-mobile -->
  <v-btn
    v-if="tab"
    color="blue-grey-darken-4"
    prepend-icon="mdi-pencil-outline"
    :size="size"
    :text="text"
    variant="text"
    :disabled="disabled"
    @click="renameSession = session"
    class="text-capitalize font-weight-medium d-none d-sm-flex"
    id="rename-session-btn"
  ></v-btn>

  <div
    v-if="renameSession"
    class="position-absolute left-0 rename-session-container px-6 py-3 bg-white d-flex justify-space-between align-center ga-4"
  >
    <v-text-field
      v-model="renameSessionTitle"
      label="Rename Session"
      hide-details
      variant="outlined"
      :append-inner-icon="
        renameSessionTitle !== props.session.title ? 'mdi-restart' : undefined
      "
      @click:append-inner="renameSessionTitle = props.session.title"
      @keyup.enter="confirmRename = true"
    ></v-text-field>
    <v-btn
      :disabled="renameSessionTitle === props.session.title"
      prepend-icon="mdi-pencil-outline"
      color="primary"
      size="x-large"
      variant="flat"
      @click="confirmRename = true"
    >
      Rename
    </v-btn>
    <v-btn variant="text" icon="mdi-close" @click="closeRename"></v-btn>
  </div>

  <v-dialog v-model="confirmRename" width="auto">
    <v-card max-width="400" prepend-icon="mdi-alert" title="Rename Session">
      <template v-slot:text>
        <p class="mt-8">
          Are you sure you want to rename the session to
          <strong>{{ renameSessionTitle }}</strong
          >?
        </p>
      </template>
      <template v-slot:actions>
        <v-spacer></v-spacer>
        <v-btn
          size="large"
          class="text-capitalize font-weight-medium"
          variant="text"
          @click="confirmRename = false"
        >
          Cancel
        </v-btn>
        <v-btn
          size="large"
          class="text-capitalize font-weight-medium"
          color="success"
          variant="flat"
          @click="renameSessionHandle"
        >
          Rename
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<style>
.rename-session-container .v-input__details {
  display: none;
}
.rename-session-container {
  width: 100%;
  bottom: -100% !important;
  z-index: 99;
}
</style>
