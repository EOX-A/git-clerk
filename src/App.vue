<script setup>
import Navbar from "@/components/global/Navbar.vue";
import { RouterView } from "vue-router";
import { onMounted, provide, ref } from "vue";
import useOctokitStore from "@/stores/octokit.js";
import { initOctokit } from "@/api/index.js";
import { useLoader } from "@/helpers/index.js";

const navButtonConfig = ref({});
const navPaginationItems = ref([
  {
    title: "All Sessions",
    disabled: false,
    to: { path: "/" },
  },
]);
const fileBrowserDrawer = ref(false);
const snackbar = ref(false);
const isOctokitInitialised = ref(false);
provide("set-nav-button-config", navButtonConfig);
provide("set-nav-pagination-items", navPaginationItems);
provide("set-snackbar", snackbar);
provide("set-file-browser-drawer", fileBrowserDrawer);

onMounted(async () => {
  const loader = useLoader().show();
  const instance = await initOctokit();

  const octokitStore = useOctokitStore();
  octokitStore.setOctokit(instance);
  isOctokitInitialised.value = true;
  loader.hide();
});
</script>

<template>
  <v-app>
    <Navbar />
    <v-main>
      <template v-if="isOctokitInitialised">
        <RouterView :key="$route.fullPath" />
      </template>
      <v-snackbar
        v-model="snackbar"
        timeout="3000"
        :color="snackbar.status"
        :text="snackbar.text"
      >
      </v-snackbar>
    </v-main>
  </v-app>
</template>
