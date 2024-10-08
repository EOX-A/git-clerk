<script setup>
import Navbar from "@/components/global/Navbar.vue";
import { RouterView } from "vue-router";
</script>

<template>
  <v-app>
    <Navbar />
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
