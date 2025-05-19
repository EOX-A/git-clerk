<script setup>
import { inject } from "vue";
import { FileBrowser } from "./";
const fileBrowserDrawer = inject("set-file-browser-drawer");

import { useDisplay } from "vuetify";

const { width } = useDisplay();

const props = defineProps({
  session: {
    type: Object,
    default: null,
  },
  updateDetails: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <v-navigation-drawer
    v-model="fileBrowserDrawer"
    temporary
    location="right"
    :width="width"
    class="file-browser-drawer"
  >
    <FileBrowser :session="session" :updateDetails="updateDetails" />
  </v-navigation-drawer>
</template>
