<script setup>
import ActionTab from "@/components/global/ActionTab.vue";
import { ref, watch, inject } from "vue";
import { DISABLE_MANUAL_FILE_CREATION } from "@/enums";

const fileBrowserDrawer = inject("set-file-browser-drawer");
const actionBtnState = ref(true);

const props = defineProps({
  updatedFilePathArr: {
    type: Array,
    default: [],
  },
  goToPath: {
    type: Function,
    default: () => {},
  },
  handleOperation: {
    type: Function,
    default: () => {},
  },
});

watch(fileBrowserDrawer, (newVal) => {
  if (newVal) {
    if (newVal === "propose") actionBtnState.value = false;
    else actionBtnState.value = true;
  } else actionBtnState.value = true;
});
</script>
<template>
  <ActionTab class="action-tab-file-browser position-sticky top-0">
    <v-icon icon="mdi-folder-open" class="text-blue" />
    <v-chip class="text-mono w-100 rounded-pill font-weight-bold">
      <v-hover
        v-for="(item, index) in updatedFilePathArr"
        v-slot="{ isHovering, props }"
        :key="item"
      >
        <span
          @click="updatedFilePathArr.length !== index + 1 && goToPath(index)"
          :class="{
            'text-decoration-underline':
              isHovering && updatedFilePathArr.length !== index + 1,
            'cursor-pointer': updatedFilePathArr.length !== index + 1,
            'opacity-50': updatedFilePathArr.length !== index + 1,
            'opacity-100': isHovering,
          }"
          v-bind="props"
        >
          {{ item || "(root)" }}/
        </span>
      </v-hover>
    </v-chip>

    <v-menu
      v-if="actionBtnState && !DISABLE_MANUAL_FILE_CREATION"
      attach
      location="bottom"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          color="primary"
          variant="flat"
          v-bind="props"
          class="ml-2 add-file-btn"
          prepend-icon="mdi-plus"
        >
          Add File
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item
          prepend-icon="mdi-file-plus-outline"
          title="Add file here"
          @click="handleOperation('add')"
        />
        <v-list-item
          prepend-icon="mdi-upload"
          title="Upload file here"
          @click="handleOperation('upload')"
        />
      </v-list>
    </v-menu>
  </ActionTab>
</template>

<style scoped>
.action-tab-file-browser {
  z-index: 1;
}
</style>
