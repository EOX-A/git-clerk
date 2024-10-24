<script setup>
import { defineProps } from "vue";

const props = defineProps({
  headline: {
    type: String,
    default: "Whoops, No sessions found.",
  },
  icon: {
    type: String,
    default: "mdi-source-pull",
  },
  btnText: {
    type: String,
    default: "Create new session",
  },
  initFunc: Function,
});
</script>

<template>
  <v-empty-state
    :headline="props.headline"
    :icon="props.icon"
    class="my-16 py-16 empty-state"
  >
    <template v-slot:text>
      To get started, you should
      <a
        @click="props.initFunc"
        class="text-blue-accent-4 font-weight-medium"
        href="#"
        >{{ props.btnText }}</a
      >
    </template>
  </v-empty-state>
</template>

<style>
.empty-state .v-empty-state__media {
  padding: 20px 0px;
}
</style>
