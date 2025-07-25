<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { CreateSession } from "@/components/session/index.js";
import { useRouter } from "vue-router";
import { createFileMethod } from "@/methods/file-edit-view/index.js";

const router = useRouter();
const snackbar = inject("set-snackbar");
const fileBrowserDrawer = inject("set-file-browser-drawer");

const updateInNewSession = ref(true);
const addNewFile = ref(false);
const sessionNumber = ref(null);
const newFileName = ref(null);

const props = defineProps({
  updatedFilePath: {
    type: String,
    required: true,
  },
  selectedOperation: {
    type: Object,
    default: null,
  },
  session: {
    type: Object,
    default: null,
  },
  resetOperation: {
    type: Function,
    default: () => {},
  },
});

const addNewSessionNumber = (newSessionNumber) => {
  updateInNewSession.value = false;
  sessionNumber.value = newSessionNumber;
  addNewFile.value = true;
};

watch(props.session, (newSession) => {
  sessionNumber.value = newSession ? newSession.number : null;
});

onMounted(() => {
  sessionNumber.value = props.session ? props.session.number : null;
});

const onKeyDown = async (event) => {
  if (event.key === "Enter") await createFile();
};

const createFile = async () => {
  const success = () => {
    fileBrowserDrawer.value = false;
    props.resetOperation();
  };
  createFileMethod(
    props.updatedFilePath,
    newFileName.value,
    props.session,
    sessionNumber.value,
    router,
    snackbar,
    success,
  );
};

const clearInput = (success) => {
  updateInNewSession.value = false;
  if (success) {
    fileBrowserDrawer.value = false;
    props.resetOperation(true);
  } else props.resetOperation(false);
};

const currentSession = () => {
  addNewFile.value = true;
  updateInNewSession.value = false;
};
</script>

<template>
  <CreateSession
    v-if="updateInNewSession"
    :createNewSession="true"
    :fromFileBrowser="true"
    :filePath="filePath"
    :clearInput="clearInput"
    :session="session"
    :currentSession="currentSession"
    :noRedirectCallback="addNewSessionNumber"
  />
  <v-dialog
    v-if="!updateInNewSession && addNewFile && sessionNumber"
    v-model="addNewFile"
    @update:modelValue="!$event && clearInput()"
    width="auto"
    style="z-index: 999999"
  >
    <v-card max-width="480" class="rounded-lg">
      <template v-slot:text>
        <h2 class="text-center pl-3 pr-3">Add a new file</h2>
        <p class="text-center px-4">
          Provide a name for the new file. (Note - File will be added to the
          path: <strong>{{ updatedFilePath }}</strong
          >)
        </p>
        <v-text-field
          @keydown="onKeyDown"
          density="compact"
          label="File Name"
          variant="solo"
          hide-details
          single-line
          flat="true"
          v-model="newFileName"
          class="rounded border-md my-3 add-file-field"
        ></v-text-field>
        <div class="d-flex ga-2 justify-center align-center">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-file-plus-outline"
            :disabled="!newFileName"
            @click="createFile"
            class="add-file-button"
          >
            Add New File
          </v-btn>
        </div>
      </template>
    </v-card>
  </v-dialog>
</template>
