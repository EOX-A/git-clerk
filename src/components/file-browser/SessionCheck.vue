<script setup>
import { ref } from "vue";

const currentSession = ref(false);
const newSession = ref(false);

const emit = defineEmits(["currentSession", "newSession"]);

const currentSessionHandler = () => {
  emit("currentSession");
};

const newSessionHandler = () => {
  emit("newSession");
};
</script>
<template>
  <div>
    <p class="py-6">
      <slot></slot>
    </p>
    <div class="d-flex align-center justify-center ga-3">
      <v-btn size="large" variant="tonal" @click="currentSessionHandler">
        Current Session
      </v-btn>
      <v-btn
        size="large"
        color="primary"
        variant="flat"
        @click="newSessionHandler"
      >
        New Session
      </v-btn>
    </div>
  </div>
</template>
