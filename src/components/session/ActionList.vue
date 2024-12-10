<script setup>
import { defineProps } from "vue";
import Actions from "./Actions.vue";

defineProps({
  session: {
    type: Object,
    required: true,
  },
  callBack: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <div class="d-none d-sm-flex">
    <Actions :session="session" :callBack="callBack" />
  </div>
  <div class="d-flex d-sm-none">
    <v-menu :close-on-content-click="false">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-dots-vertical"
          variant="text"
          color="blue-grey-darken-4"
        ></v-btn>
      </template>
      <v-list>
        <Actions :session="session" :callBack="callBack" />
      </v-list>
    </v-menu>
  </div>
</template>
