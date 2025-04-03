<script setup>
import { defineProps } from "vue";
import Tooltip from "@/components/global/Tooltip.vue";

const props = defineProps({
  url: String,
  tab: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "large",
  },
  text: {
    type: String,
    default: "Deployed Preview",
  },
  tooltip: {
    type: String,
    default: "View deployed preview",
  },
});
</script>

<template>
  <!-- Tab = true -->
  <!-- Mobile -->
  <v-btn
    v-if="tab"
    :href="url"
    target="_blank"
    color="blue-grey-darken-4"
    icon="mdi-arrow-top-right"
    :size="size"
    variant="outlined"
    class="d-flex d-md-none border-black border-md border-opacity-100"
    id="deployed-preview-btn"
  ></v-btn>
  <!-- Non-mobile -->
  <v-btn
    v-if="tab"
    :href="url"
    target="_blank"
    color="blue-grey-darken-4"
    prepend-icon="mdi-arrow-top-right"
    :size="size"
    :text="text"
    variant="outlined"
    class="text-capitalize font-weight-medium d-none d-md-flex border-black border-md border-opacity-100"
    id="deployed-preview-btn"
  ></v-btn>

  <!-- Tab = false -->
  <!-- Mobile -->
  <v-list-item
    v-if="!tab"
    :href="url"
    target="_blank"
    prepend-icon="mdi-arrow-top-right"
    :title="props.tooltip"
    class="d-flex d-sm-none"
    id="deployed-preview-btn"
  ></v-list-item>
  <!-- Non-mobile -->
  <Tooltip :text="props.tooltip">
    <v-btn
      v-if="!tab"
      :href="url"
      target="_blank"
      color="blue-grey-darken-4"
      icon="mdi-arrow-top-right"
      :size="size"
      variant="text"
      class="d-none d-sm-flex"
      id="deployed-preview-btn"
    ></v-btn>
  </Tooltip>
</template>
