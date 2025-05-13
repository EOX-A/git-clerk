<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { CreateSession } from "@/components/session/index.js";
import { SessionCheck } from "./";
import { useLoader } from "@/helpers/index.js";
import { createAndUpdateFile, getSessionDetails } from "@/api/index.js";
import { encodeString } from "@/helpers/index.js";
import { useRouter } from "vue-router";

const router = useRouter();
const snackbar = inject("set-snackbar");
const fileBrowserDrawer = inject("set-file-browser-drawer");

const updateInNewSession = ref(false);
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
  sessionNumber.value = newSessionNumber;
  addNewFile.value = true;
};

watch(props.session, (newSession) => {
  sessionNumber.value = newSession ? newSession.number : null;
});

onMounted(() => {
  updateInNewSession.value = props.session ? false : true;
  sessionNumber.value = props.session ? props.session.number : null;
});

const createFile = async () => {
  if (!newFileName.value) {
    snackbar.value = {
      text: "Please add a filename",
      status: "error",
    };
    return;
  }
  const loader = useLoader().show();

  const fullFilePath = (
    props.updatedFilePath + (newFileName.value || "")
  ).replace("/", "");

  const content = {
    data: "",
    type: "string",
  };

  const sha = props.session?.head?.sha || null;

  const sessionDetails = await getSessionDetails(sessionNumber.value);

  snackbar.value = await createAndUpdateFile(
    sessionDetails,
    fullFilePath,
    newFileName.value,
    content,
    sha,
  );
  loader.hide();
  if (snackbar.value.status === "success") {
    fileBrowserDrawer.value = false;
    props.resetOperation();
    await router.push(`/${sessionNumber.value}/${encodeString(fullFilePath)}`);
  }
};
</script>

<template>
  <v-card
    max-width="400"
    prepend-icon="mdi-file-plus-outline"
    title="Add a new file"
  >
    <template v-slot:text>
      <div v-if="addNewFile && sessionNumber">
        <p class="py-6">
          Provide a name for the new file. (Note - File will be added to the
          path: <strong>{{ updatedFilePath }}</strong
          >)
        </p>
        <v-text-field
          v-model="newFileName"
          label="File Name"
          placeholder="File Name"
          variant="outlined"
        />
        <v-btn
          color="primary"
          size="large"
          variant="flat"
          block
          @click="createFile"
        >
          Add File
        </v-btn>
      </div>
      <div v-else-if="updateInNewSession">
        <p class="py-6">
          Create a new session to add a new file to the path:
          <strong>{{ updatedFilePath }}</strong
          >. Please provide a name for the new session.
        </p>
        <CreateSession
          :createNewSession="true"
          :fromFileBrowser="true"
          :noRedirectCallback="addNewSessionNumber"
        />
      </div>
      <SessionCheck
        @currentSession="addNewFile = true"
        @newSession="updateInNewSession = true"
        v-else
      >
        Do you want to add a new file to
        <strong>{{ updatedFilePath }}</strong> in a
        <strong>new session</strong> or <strong>current session</strong>?
      </SessionCheck>
    </template>
  </v-card>
</template>
