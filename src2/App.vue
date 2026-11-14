<script setup>
import { RouterView } from "vue-router";
</script>

<template>
  <main class="min-h-screen bg-white text-slate-900">
    <RouterView :key="$route.fullPath" />
  </main>
</template>
