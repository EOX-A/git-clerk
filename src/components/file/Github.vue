<script setup>
import { defineProps } from "vue";
const props = defineProps({
  file: {
    type: Object,
    default: {},
  },
});
</script>
<template>
  <v-btn
    :href="file.html_url"
    target="_blank"
    color="blue-grey-darken-4"
    :icon="$vuetify?.display?.smAndDown ? 'mdi-github' : false"
    prepend-icon="mdi-github"
    size="x-large"
    variant="text"
    :text="$vuetify?.display?.smAndDown ? '' : 'View on Github'"
    class="text-capitalize font-weight-medium"
  ></v-btn>
</template>
