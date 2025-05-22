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
    id="preview-toggle-btn"
    :color="showPreview ? 'primary' : 'blue-grey-darken-4'"
    :icon="
      $vuetify?.display?.smAndDown
        ? showPreview
          ? 'mdi-eye-off'
          : 'mdi-eye'
        : false
    "
    :prepend-icon="showPreview ? 'mdi-eye-off' : 'mdi-eye'"
    :variant="showPreview ? 'flat' : 'text'"
    :text="
      $vuetify?.display?.smAndDown
        ? ''
        : showPreview
          ? 'Hide Preview'
          : 'Show Preview'
    "
    size="x-large"
    class="hide-show-preview-btn ml-5"
    @click="togglePreview"
  ></v-btn>
</template>
