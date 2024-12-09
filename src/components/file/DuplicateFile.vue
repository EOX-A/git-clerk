<script setup>
import Tooltip from "@/components/global/Tooltip.vue";
import { defineProps, ref } from "vue";
import CreateFile from "@/components/file/CreateFile.vue";

const props = defineProps({
  file: {
    type: Object,
    default: {},
  },
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
    default: "",
  },
  callBack: Function,
});

const duplicateFile = ref(false);

const duplicateFileClick = async (state) => {
  duplicateFile.value = state;
};
</script>

<template>
  <Tooltip text="Duplicate File">
    <v-btn
      color="blue-grey-darken-4"
      :icon="props.text ? false : 'mdi-content-copy'"
      prepend-icon="mdi-content-copy"
      :size="props.size"
      :text="props.text"
      variant="text"
      :disabled="props.file?.status === 'removed'"
      @click="duplicateFileClick(props.file)"
      class="text-capitalize font-weight-medium"
    ></v-btn>
  </Tooltip>
  <div
    v-if="duplicateFile"
    class="position-absolute top-0 left-0 w-100 bg-grey-lighten-4 z-index"
  >
    <CreateFile
      :updateDetails="() => {}"
      :addNewFileClick="duplicateFileClick"
      :open="duplicateFile"
      :session="props.session"
      :duplicateFile="duplicateFile"
    />
  </div>
</template>
