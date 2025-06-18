<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { CreateSession } from "@/components/session/index.js";
import { getSessionDetails } from "@/api/index.js";
import { useRouter } from "vue-router";
import { UploadArea } from "@/components/file";

const router = useRouter();
const fileBrowserDrawer = inject("set-file-browser-drawer");

const updateInNewSession = ref(true);
const uploadNewFile = ref(false);
const sessionNumber = ref(null);

const repoDetails = ref(null);

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
  updateDetails: {
    type: Function,
    default: () => {},
  },
  resetOperation: {
    type: Function,
    default: () => {},
  },
});

const uploadNewSessionNumber = async (newSessionNumber) => {
  repoDetails.value = await getSessionDetails(newSessionNumber);
  updateInNewSession.value = false;
  sessionNumber.value = newSessionNumber;
  uploadNewFile.value = true;
};

watch(props.session, (newSession) => {
  sessionNumber.value = newSession ? newSession.number : null;
});

const close = () => {
  fileBrowserDrawer.value = false;
  props.resetOperation(false);
  router.push(`/${sessionNumber.value}`);
};

onMounted(() => {
  sessionNumber.value = props.session ? props.session.number : null;
});

const clearInput = (success) => {
  updateInNewSession.value = false;
  if (success) {
    fileBrowserDrawer.value = false;
    props.resetOperation(true);
  } else props.resetOperation(false);
};

const currentSession = () => {
  uploadNewFile.value = true;
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
    :noRedirectCallback="uploadNewSessionNumber"
  />
  <v-dialog
    v-if="!updateInNewSession && uploadNewFile && sessionNumber"
    v-model="uploadNewFile"
    @update:modelValue="!$event && clearInput()"
    width="auto"
    style="z-index: 999999"
  >
    <v-card max-width="480">
      <template v-slot:text>
        <h2 class="text-center pl-3 pr-3">Upload a new files</h2>
        <p class="text-center px-4">
          Provide a name for the new file. (Note - File will be uploaded to the
          path: <strong>{{ updatedFilePath }}</strong
          >)
        </p>
        <UploadArea
          :session="repoDetails || props.session"
          :filePath="updatedFilePath.replace('/', '')"
          :close="close"
          :updateDetails="updateDetails"
          :fromFileBrowser="true"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
