<template>
  <Tooltip text="Open in Github">
    <v-btn
      :href="url"
      target="_blank"
      color="blue-grey-darken-4"
      icon="mdi-github"
      size="large"
      variant="text"
      class="d-none d-sm-flex"
    ></v-btn>
  </Tooltip>
  <v-list-item
    :href="url"
    target="_blank"
    prepend-icon="mdi-github"
    title="Open in Github"
    class="d-flex d-sm-none"
  ></v-list-item>
</template>

<script setup>
import { defineProps } from "vue";
import Tooltip from "@/components/global/Tooltip.vue";

const props = defineProps({
  url: String,
});
</script>
