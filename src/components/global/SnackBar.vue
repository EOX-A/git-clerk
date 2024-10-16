<script setup>
import { ref } from "vue";

const visible = ref(false);
const message = ref("");
const color = ref("success");
const timeout = ref(3000);

const close = () => {
  visible.value = false;
};
</script>

<template>
  <v-snackbar v-model="visible" :timeout="timeout" :color="color">
    {{ message }}
    <v-btn color="white" text @click="close">Close</v-btn>
  </v-snackbar>
</template>
