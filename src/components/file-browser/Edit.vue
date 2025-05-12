<script setup>
import { ref, inject, onMounted } from "vue";
import CreateSession from "@/components/session/CreateSession.vue";
import { useRouter } from "vue-router";
import { encodeString } from "@/helpers/index.js";
import { SessionCheck } from "./";

const router = useRouter();

const fileBrowserDrawer = inject("set-file-browser-drawer");

const updateInNewSession = ref(false);

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
});

const filePath = () => {
  return encodeString(
    (props.updatedFilePath + props.selectedOperation.meta.name).replace(
      "/",
      "",
    ),
  );
};

const clearInput = () => {
  fileBrowserDrawer.value = false;
};

const currentSession = () => {
  router.push(`/${props.session.number}/${filePath()}`);
  fileBrowserDrawer.value = false;
};

onMounted(() => {
  updateInNewSession.value = props.session ? false : true;
});
</script>
<template>
  <v-card max-width="400" prepend-icon="mdi-pencil" title="Edit File">
    <template v-slot:text>
      <div v-if="updateInNewSession">
        <p class="py-6">
          Create a new session to edit
          <strong>{{ selectedOperation.meta.name }}</strong
          >. Please provide a name for the new session.
        </p>
        <CreateSession
          :createNewSession="true"
          :fromFileBrowser="true"
          :filePath="filePath"
          :clearInput="clearInput"
        />
      </div>
      <SessionCheck
        @currentSession="currentSession"
        @newSession="updateInNewSession = true"
        v-else
      >
        Do you want to edit
        <strong>{{ selectedOperation.meta.name }}</strong> in a
        <strong>new session</strong> or <strong>current session</strong>?
      </SessionCheck>
    </template>
  </v-card>
</template>
