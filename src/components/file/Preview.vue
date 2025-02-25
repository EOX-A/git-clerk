<script setup>
import { defineProps } from "vue";
const props = defineProps({
  togglePreview: Function,
  showPreview: Boolean,
  previewURL: String,
});
</script>
<template>
  <v-btn
    v-if="previewURL"
    :color="showPreview ? 'light-secondary' : 'primary'"
    :icon="
      $vuetify?.display?.smAndDown
        ? showPreview
          ? 'mdi-eye-off'
          : 'mdi-eye'
        : false
    "
    :prepend-icon="showPreview ? 'mdi-eye-off' : 'mdi-eye'"
    variant="flat"
    :text="
      $vuetify?.display?.smAndDown
        ? ''
        : showPreview
          ? 'Hide Preview'
          : 'Show Preview'
    "
    class="text-capitalize font-weight-medium ml-5 rounded-pill"
    @click="togglePreview"
  ></v-btn>
</template>
