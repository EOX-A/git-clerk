<script setup>
import { createSession } from "@/helpers/index.js";
import { useRoute, useRouter } from "vue-router";
import { ref, inject } from "vue";

const loader = ref({});
const newSessionName = ref("");

const route = useRoute();
const router = useRouter();

const snackbar = inject("set-snackbar");

const openCreateSession = ref(true);

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
  session: {
    type: Object,
  },
  currentSession: {
    type: Function,
  },
});

const create = async () => {
  const url = new URL(window.location.href);
  const toFileBrowser = Boolean(url.searchParams.get("file-browser"));

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
    toFileBrowser,
  );
};

const clear = () => {
  props.clearInput();
  newSessionName.value = "";
  if (!props.fromFileBrowser) {
    const url = new URL(window.location.href);
    url.searchParams.delete("file-browser");
    window.history.replaceState({}, "", url);
  }
};

const onKeyEnter = async (event) => {
  if (event.key === "Escape") clear();
  else if (event.key === "Enter") await create();
};
</script>

<template>
  <v-dialog
    v-model="openCreateSession"
    @update:model-value="!$event && clear()"
    width="auto"
  >
    <v-card max-width="480" class="rounded-lg">
      <template v-slot:text>
        <h2 class="text-center pl-3 pr-3">
          {{ session ? "Choose a session" : "Create New Session" }}
        </h2>
        <p class="text-center px-4">
          {{
            session
              ? "Begin a new session or edit in current session to add a new content or propose a file change."
              : "Begin a new session to add a new content or propose a file change."
          }}
        </p>
        <v-alert
          class="my-6"
          title="What is a session?"
          text="A session lets you group and review edits to multiple files before submitting them for approval. Original files stay unchanged until approved."
          type="success"
          variant="tonal"
          icon="mdi-information"
          rounded="lg"
          @keydown="onKeyEnter"
        ></v-alert>
        <v-text-field
          density="compact"
          label="Session Name"
          variant="solo"
          hide-details
          single-line
          flat="true"
          v-model="newSessionName"
          class="rounded border-md my-3"
        ></v-text-field>
        <div class="d-flex ga-2 justify-center align-center">
          <v-btn
            v-if="session && currentSession"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-pencil"
            :disabled="newSessionName !== ''"
            @click="currentSession"
          >
            Edit in current session
          </v-btn>
          <span
            v-if="session && currentSession"
            class="text-center font-weight-bold opacity-50 text-body-2"
            >OR</span
          >
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-plus"
            :disabled="!newSessionName"
            @click="create"
          >
            Create New Session
          </v-btn>
        </div>
      </template>
    </v-card>
  </v-dialog>
</template>
