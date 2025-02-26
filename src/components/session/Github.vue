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
    default: "View Session",
  },
  tooltip: {
    type: String,
    default: "View this session on GitHub",
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
    icon="mdi-github"
    :size="size"
    variant="text"
    class="d-flex d-sm-none"
  ></v-btn>
  <!-- Non-mobile -->
  <v-btn
    v-if="tab"
    :href="url"
    target="_blank"
    color="blue-grey-darken-4"
    prepend-icon="mdi-github"
    :size="size"
    :text="text"
    variant="text"
    class="text-capitalize font-weight-medium d-none d-sm-flex"
  ></v-btn>

  <!-- Tab = false -->
  <!-- Mobile -->
  <v-list-item
    v-if="!tab"
    :href="url"
    target="_blank"
    prepend-icon="mdi-github"
    :title="props.tooltip"
    class="d-flex d-sm-none"
  ></v-list-item>
  <!-- Non-mobile -->
  <Tooltip :text="props.tooltip">
    <v-btn
      v-if="!tab"
      :href="url"
      target="_blank"
      color="blue-grey-darken-4"
      icon="mdi-github"
      :size="size"
      variant="text"
      class="d-none d-sm-flex"
    ></v-btn>
  </Tooltip>
</template>
