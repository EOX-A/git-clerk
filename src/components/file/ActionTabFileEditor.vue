<script setup>
import { DeleteFile } from "@/components/file/index.js";
import Tooltip from "@/components/global/Tooltip.vue";
import { defineProps } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  file: {
    type: Object,
    default: {},
  },
  reset: {
    type: Boolean,
    default: false,
  },
  resetContent: Function,
});
</script>

<template>
  <div class="bg-secondary px-5 py-3 d-flex align-center ga-1 action-tab">
    <v-btn
      :href="file.html_url"
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-github"
      size="x-large"
      variant="text"
      text="Github"
      class="text-capitalize font-weight-medium"
    ></v-btn>
    <v-btn
      target="_blank"
      color="blue-grey-darken-4"
      prepend-icon="mdi-monitor-eye"
      size="x-large"
      variant="text"
      text="Preview"
      class="text-capitalize font-weight-medium"
    ></v-btn>
    <DeleteFile
      text="Delete File"
      size="x-large"
      :file
      :session
      :callBack="() => router.push(`/${session.number}`)"
    />
    <v-spacer></v-spacer>
    <Tooltip text="Reset Content">
      <v-btn
        color="blue-grey-darken-4"
        icon="mdi-restart"
        size="large"
        variant="text"
        :disabled="reset"
        @click="resetContent"
      ></v-btn>
    </Tooltip>
  </div>
</template>
