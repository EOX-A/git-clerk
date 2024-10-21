<script setup>
import { defineProps } from "vue";

defineProps({
  text: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: "bottom",
  },
});
</script>

<template>
  <v-tooltip :text="text" :location="location">
    <template v-slot:activator="{ on: tooltipOn, props: tooltipProps }">
      <div v-bind="tooltipProps">
        <slot />
      </div>
    </template>
  </v-tooltip>
</template>
