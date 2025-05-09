<script setup>
import { inject } from "vue";
import { FileBrowser } from "./";
const fileBrowserDrawer = inject("set-file-browser-drawer");

const props = defineProps({
  session: {
    type: Object,
    default: null,
  },
});
</script>

<template>
  <v-navigation-drawer
    v-model="fileBrowserDrawer"
    temporary
    location="right"
    width="800"
    class="file-browser-drawer"
  >
    <FileBrowser :session="session" />
  </v-navigation-drawer>
</template>

<style scoped>
.file-browser-drawer {
  z-index: 999999 !important;
  top: 0 !important;
  height: 100% !important;
}

.v-navigation-drawer__scrim {
  z-index: 99999 !important;
}
</style>
