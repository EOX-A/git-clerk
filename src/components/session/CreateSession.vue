<script setup>
import { createSession } from "@/helpers/index.js";
import { useRoute, useRouter } from "vue-router";
import { ref, inject, watch } from "vue";
import useOctokitStore from "@/stores/octokit";
import { storeToRefs } from "pinia";

const { forkOptions, sessionsScope } = storeToRefs(useOctokitStore());

const loader = ref({});
const newSessionName = ref("");
const sessionOwner = ref(null);

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
  await createSession(
    {
      newSessionName,
      snackbar,
      loader,
      forkOwner: sessionOwner,
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

const isSelectable = (option) => option.forkExists || option.canCreateFork;

const roleOf = (option) => {
  if (option.type === "personal") return "Your fork";
  if (!isSelectable(option)) return "No fork and no permission to create one";
  if (!option.forkExists) return "Fork is created with the first session";
  if (option.collaborator)
    return option.role === "admin" ? "Admin (collaborator)" : "Collaborator";
  return option.role === "admin" ? "Admin" : "Member";
};

watch(
  forkOptions,
  (options) => {
    const selectable = options.filter(isSelectable);
    if (!selectable.some((option) => option.owner === sessionOwner.value)) {
      const preferred =
        selectable.find((option) => option.owner === sessionsScope.value) ||
        selectable[0];
      sessionOwner.value = preferred?.owner || null;
    }
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <v-dialog
    v-model="openCreateSession"
    @update:model-value="!$event && clear()"
    width="auto"
    class="session-create-field"
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
          class="my-4"
          title="What is a session?"
          text="A session lets you group and review edits to multiple files before submitting them for approval. Original files stay unchanged until approved."
          type="success"
          variant="tonal"
          icon="mdi-information"
          rounded="lg"
          @keydown="onKeyEnter"
        ></v-alert>
        <div class="d-flex flex-column ga-4">
          <v-text-field
            density="compact"
            label="Session Name"
            variant="solo"
            hide-details
            single-line
            flat="true"
            v-model="newSessionName"
            class="rounded border-md session-name-field"
          ></v-text-field>
          <v-select
            v-if="forkOptions.length > 1"
            v-model="sessionOwner"
            label="Session owner"
            density="comfortable"
            persistent-hint
            :hint="
              sessionOwner
                ? `The session branch is created in the '${sessionOwner}' fork.`
                : ''
            "
            :items="forkOptions"
            item-title="name"
            item-value="owner"
            single-line
            variant="outlined"
            class="session-owner-select"
          >
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item
                v-bind="itemProps"
                :disabled="!isSelectable(item.raw)"
                :class="`session-owner-item owner-${item.raw.owner}`"
              >
                <template v-slot:subtitle>
                  {{ item.raw.fullName }} ·
                  <strong>{{ roleOf(item.raw) }}</strong>
                </template>
              </v-list-item>
            </template>
          </v-select>
          <div class="d-flex ga-2 justify-center align-center">
            <v-btn
              v-if="session && currentSession"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-pencil"
              :disabled="newSessionName !== ''"
              @click="currentSession"
              class="current-session-btn"
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
              :disabled="
                !newSessionName || (forkOptions.length > 1 && !sessionOwner)
              "
              @click="create"
              class="new-session-btn"
            >
              Create New Session
            </v-btn>
          </div>
        </div>
      </template>
    </v-card>
  </v-dialog>
</template>
