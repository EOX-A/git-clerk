<script setup>
import { inject, computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const navButtonConfig = inject("set-nav-button-config");
const navPaginationItems = inject("set-nav-pagination-items");
const fileBrowserDrawer = inject("set-file-browser-drawer");
import { VIEWING_MODE } from "@/enums";

import Tooltip from "@/components/global/Tooltip.vue";

const isFileBrowser = computed(() => {
  return router.currentRoute.value.path === "/file-browser";
});

const fileBrowserItem = ref([
  {
    title: "File Browser",
    disabled: false,
    to: { path: "/file-browser" },
  },
]);

const click = () => {
  navButtonConfig.value.click();
  fileBrowserDrawer.value = false;
};
</script>
<template>
  <v-app-bar class="navbar" color="primary" app>
    <v-toolbar-title class="toolbar-title">
      <v-breadcrumbs
        :items="isFileBrowser ? fileBrowserItem : navPaginationItems"
      >
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

    <v-btn
      size="large"
      :prepend-icon="
        isFileBrowser || fileBrowserDrawer === true
          ? 'mdi-source-pull'
          : 'mdi-folder-open'
      "
      variant="tonal"
      class="text-capitalize font-weight-medium"
      color="white"
      @click="
        isFileBrowser
          ? router.push('/')
          : (fileBrowserDrawer = !fileBrowserDrawer)
      "
      >{{
        isFileBrowser
          ? "View Sessions"
          : fileBrowserDrawer === true
            ? "View Session"
            : "Browse Files"
      }}</v-btn
    >

    <v-col class="button-nav flex-grow-0">
      <v-btn
        v-if="navButtonConfig.text && navButtonConfig.click"
        size="large"
        :prepend-icon="navButtonConfig.icon"
        variant="flat"
        class="text-capitalize font-weight-medium"
        color="white"
        :disabled="navButtonConfig.disabled"
        @click="click"
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
            @click="fileBrowserDrawer = false"
            :disabled="navButtonConfig.disabled"
          >
            {{ navButtonConfig.text }}
            <v-icon
              v-if="navButtonConfig.list"
              size="x-large"
              class="ml-1"
              icon="mdi-menu-down"
            ></v-icon>
          </v-btn>
        </template>
        <v-list class="pa-0 button-list" density="compact">
          <template :key="index" v-for="(item, index) in navButtonConfig.list">
            <v-divider
              thickness="1"
              class="mx-3"
              v-if="
                item.manual &&
                index > 0 &&
                !navButtonConfig.list[index - 1].manual
              "
            ></v-divider>
            <v-list-item
              :title="item.title"
              @click="item.click"
              class="m-0 py-3"
              active-color="grey-lighten-3"
              hover
            >
              <template v-slot:title>
                <div class="d-flex align-center ga-3">
                  <v-icon
                    :icon="item.icon"
                    color="surface-darker"
                    class="opacity-100 flex items-end justify-center"
                    size="20"
                  >
                  </v-icon>
                  <span class="text-surface-darker opacity-100 text-body-2">{{
                    item.title
                  }}</span>
                </div>
              </template>
              <template v-if="item.description && !item.manual" v-slot:append>
                <Tooltip location="bottom" :text="item.description">
                  <v-icon
                    icon="mdi-information-outline"
                    color="surface-darker ml-4"
                    class="opacity-100"
                    size="20"
                  >
                  </v-icon>
                </Tooltip>
              </template>
            </v-list-item>
          </template>
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
