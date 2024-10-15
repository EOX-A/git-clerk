<!-- Snackbar.vue -->
<template>
  <v-snackbar v-model="visible" :timeout="timeout" :color="color">
    {{ message }}
    <v-btn color="white" text @click="close">Close</v-btn>
  </v-snackbar>
</template>

<script>
export default {
  data() {
    return {
      visible: false,
      message: "",
      color: "success",
      timeout: 3000,
    };
  },
  methods: {
    show({ message, color = "success", timeout = 3000 }) {
      this.message = message;
      this.color = color;
      this.timeout = timeout;
      this.visible = true;
    },
    close() {
      this.visible = false;
    },
  },
};
</script>
