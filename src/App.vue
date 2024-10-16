<script setup>
import Navbar from "@/components/global/Navbar.vue";
import { RouterView } from "vue-router";
import { provide, ref } from "vue";

const navButtonConfig = ref({});
provide("set-nav-button-config", navButtonConfig);
</script>

<template>
  <v-app>
    <Navbar />
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
