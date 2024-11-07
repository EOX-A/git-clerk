<script setup>
import { inject } from "vue";

const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");
</script>
<template>
  <v-app-bar class="navbar" color="primary" app>
    <v-toolbar-title>
      <v-breadcrumbs :items="navPaginationItems">
        <template v-slot:divider>
          <v-icon icon="mdi-chevron-right"></v-icon>
        </template>
      </v-breadcrumbs>
    </v-toolbar-title>

    <v-col class="button-nav flex-grow-0">
      <v-btn
        v-if="navButtonConfig.text"
        size="large"
        :prepend-icon="navButtonConfig.icon"
        variant="flat"
        class="text-capitalize font-weight-medium"
        color="btn-primary"
        :disabled="navButtonConfig.disabled"
        @click="navButtonConfig.click"
        >{{ navButtonConfig.text }}</v-btn
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
