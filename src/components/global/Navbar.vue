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
        v-if="navButtonConfig.text && navButtonConfig.click"
        size="large"
        :prepend-icon="navButtonConfig.icon"
        variant="flat"
        class="text-capitalize font-weight-medium"
        color="white"
        :disabled="navButtonConfig.disabled"
        @click="navButtonConfig.click"
        >{{ navButtonConfig.text }}</v-btn
      >
      <v-menu
        location="bottom"
        v-if="navButtonConfig.text && navButtonConfig.list"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            size="large"
            :prepend-icon="navButtonConfig.icon"
            variant="flat"
            class="text-capitalize font-weight-medium"
            color="white"
            v-bind="props"
            :disabled="navButtonConfig.disabled"
            >{{ navButtonConfig.text }}</v-btn
          >
        </template>
        <v-list class="pa-2 button-list" density="compact">
          <v-list-item
            v-for="(item, index) in navButtonConfig.list"
            :prepend-icon="item.icon"
            :title="item.title"
            :key="index"
            @click="item.click"
            class="rounded-lg m-0"
            color="grey-lighten-4"
            active-color="grey-lighten-3"
            hover
          >
            <template v-slot:prepend>
              <v-icon size="20">
                {{ item.icon }}
              </v-icon>
            </template>
            <template v-slot:title>
              <span class="text-body-2 font-weight-regular">{{
                item.title
              }}</span>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-col>
  </v-app-bar>
</template>

<style>
.navbar .v-breadcrumbs-item.v-breadcrumbs-item--disabled {
  opacity: 0.5;
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
.button-list .v-list-item__prepend .v-list-item__spacer {
  width: 18px !important;
}
</style>
