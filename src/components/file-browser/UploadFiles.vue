<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { CreateSession2 } from "@/components/session/index.js";
import { SessionCheck } from "./";
import { getSessionDetails } from "@/api/index.js";
import { useRouter } from "vue-router";
import { UploadArea } from "@/components/file";

const router = useRouter();
const fileBrowserDrawer = inject("set-file-browser-drawer");

const updateInNewSession = ref(false);
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
  updateInNewSession.value = props.session ? false : true;
  sessionNumber.value = props.session ? props.session.number : null;
});
</script>

<template>
  <v-card
    max-width="400"
    prepend-icon="mdi-file-plus-outline"
    title="Upload a new files"
  >
    <template v-slot:text>
      <div v-if="uploadNewFile && sessionNumber">
        <p class="py-6">
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
      </div>
      <div v-else-if="updateInNewSession">
        <p class="py-6">
          Create a new session to upload a new file to the path:
          <strong>{{ updatedFilePath }}</strong
          >. Please provide a name for the new session.
        </p>
        <CreateSession2
          :createNewSession="true"
          :fromFileBrowser="true"
          :noRedirectCallback="uploadNewSessionNumber"
        />
      </div>
      <SessionCheck
        @currentSession="uploadNewFile = true"
        @newSession="updateInNewSession = true"
        v-else
      >
        Do you want to upload a new file to
        <strong>{{ updatedFilePath }}</strong> in a
        <strong>new session</strong> or <strong>current session</strong>?
      </SessionCheck>
    </template>
  </v-card>
</template>
