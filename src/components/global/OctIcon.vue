<script setup>
import { computed } from "vue";
import * as Octicons from "@primer/octicons";
import "@primer/octicons/build/build.css";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
});

const iconSvg = computed(() => {
  const icon = Octicons[props.name];
  if (icon && typeof icon.toSVG === "function") {
    return icon.toSVG();
  }
  return "";
});
</script>

<template>
  <span v-html="iconSvg"></span>
</template>
