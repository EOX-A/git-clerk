<script setup>
import { ref } from "vue";

const navItems = ref([
  {
    title: "All Sessions",
    disabled: false,
    href: "/",
  },
  {
    title: "Products for Dry Tropospheric Correction",
    disabled: false,
    href: "/products-for-dry-tropospheric-correction",
  },
  {
    title: "Variables/catal...",
    disabled: true,
  },
]);
</script>
<template>
  <v-app-bar class="navbar" color="primary" app>
    <v-toolbar-title>
      <v-breadcrumbs :items="navItems">
        <template v-slot:divider>
          <v-icon icon="mdi-chevron-right"></v-icon>
        </template> </v-breadcrumbs
    ></v-toolbar-title>

    <v-col class="button-nav flex-grow-0">
      <v-btn
        size="large"
        prepend-icon="mdi-source-pull"
        variant="flat"
        class="text-capitalize font-weight-medium"
        color="btn-primary"
        >Create New Session</v-btn
      >
    </v-col>
  </v-app-bar>
</template>

<style>
.navbar .v-breadcrumbs-item.v-breadcrumbs-item--disabled {
  color: #adddff;
  opacity: 0.8;
}
.navbar .button-nav {
  margin-right: 20px;
}
</style>
