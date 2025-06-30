<script setup>
import { ref, inject } from "vue";
import { CreateSession } from "@/components/session/index.js";
import { useRouter } from "vue-router";
import { encodeString } from "@/helpers/index.js";

const router = useRouter();

const fileBrowserDrawer = inject("set-file-browser-drawer");

const updateInNewSession = ref(true);

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

const filePath = () => {
  return encodeString(
    (props.updatedFilePath + props.selectedOperation.meta.name).replace(
      "/",
      "",
    ),
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
  router.push(`/${props.session.number}/${filePath()}`);
  fileBrowserDrawer.value = false;
  props.resetOperation();
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
  />
</template>
