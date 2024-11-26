<script setup>
import { inject } from "vue";

const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");
</script>
<template>
  <v-app-bar class="navbar" color="primary" app>
    <v-toolbar-title class="toolbar-title">
      <v-breadcrumbs :items="navPaginationItems">
        <template v-slot:divider>
          <v-icon icon="mdi-chevron-right"></v-icon>
        </template>
        <template v-slot:title="{ item }">
          <v-icon
            v-if="
              $vuetify.display.smAndDown &&
              navPaginationItems.indexOf(item) === 0
            "
            icon="mdi-folder-outline"
            size="x-large"
            class="text-h5"
          />
          <div
            v-else
            class="d-flex align-center text-truncate"
            :style="$vuetify.display.smAndDown ? 'max-width: 50px' : ''"
          >
            {{ item.title }}
          </div>
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
.toolbar-title {
  margin-inline-start: 20px;
}
@media (max-width: 600px) {
  .navbar .button-nav {
    margin-right: 8px;
  }
  .navbar .v-toolbar__content > .v-toolbar-title {
    margin-inline-start: 8px;
  }
}
</style>
