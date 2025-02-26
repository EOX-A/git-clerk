<script setup>
import { defineProps } from "vue";
import Tooltip from "@/components/global/Tooltip.vue";
const props = defineProps({
  file: {
    type: Object,
    default: {},
  },
  tooltip: {
    type: String,
    default: "View this file on GitHub",
  },
});
</script>
<template>
  <Tooltip :text="props.tooltip">
    <v-btn
      :href="file.html_url"
      target="_blank"
      color="blue-grey-darken-4"
      :icon="$vuetify?.display?.smAndDown ? 'mdi-github' : false"
      prepend-icon="mdi-github"
      size="x-large"
      variant="text"
      :text="$vuetify?.display?.smAndDown ? '' : 'View File'"
      class="text-capitalize font-weight-medium"
    ></v-btn>
  </Tooltip>
</template>
