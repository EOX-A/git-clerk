<script setup>
import { createSession } from "@/helpers/index.js";
import { useRoute, useRouter } from "vue-router";
import { ref, inject } from "vue";

const loader = ref({});
const newSessionName = ref("");

const route = useRoute();
const router = useRouter();

const snackbar = inject("set-snackbar");

const props = defineProps({
  createNewSession: {
    type: Boolean,
    default: false,
  },
  noRedirectCallback: {
    type: Function,
  },
  clearInput: {
    type: Function,
    default: () => {},
  },
  fromFileBrowser: {
    type: Boolean,
    default: false,
  },
  filePath: {
    type: String,
    default: "",
  },
});

const create = async () => {
  await createSession(
    {
      newSessionName,
      snackbar,
      loader,
    },
    router,
    route,
    props.clearInput,
    props.filePath,
    props.noRedirectCallback,
  );
};

const clear = () => {
  props.clearInput();
  newSessionName.value = "";
};

const onKeyEnter = async (event) => {
  if (event.key === "Escape") clear();
  else if (event.key === "Enter") await create();
};
</script>
<template>
  <div
    v-if="createNewSession"
    :class="{ 'bg-white d-flex justify-center': !fromFileBrowser }"
  >
    <v-row>
      <v-col cols="12" class="d-flex">
        <!-- Custom styled text field -->
        <div
          :class="{ 'px-6 py-6 border-b-thin': !fromFileBrowser }"
          class="session-create-field d-flex w-100 align-center justify-center ga-4"
        >
          <v-text-field
            v-model="newSessionName"
            label="Session Name"
            placeholder="Name your Session..."
            hide-details
            :append-inner-icon="
              newSessionName.length > 0 ? 'mdi-restart' : undefined
            "
            @click:append-inner="newSessionName = ''"
            @keydown="onKeyEnter"
            variant="outlined"
          />
          <v-btn
            v-if="!fromFileBrowser"
            prepend-icon="mdi-plus"
            color="primary"
            size="x-large"
            variant="flat"
            @click="create"
          >
            Create
          </v-btn>
          <v-btn
            v-if="!fromFileBrowser"
            variant="text"
            icon="mdi-close"
            @click="clear"
          ></v-btn>
        </div>
      </v-col>
    </v-row>
    <v-btn
      v-if="fromFileBrowser"
      color="primary"
      size="large"
      variant="flat"
      @click="create"
      class="mt-4"
      block
    >
      Create New Session
    </v-btn>
  </div>
</template>
