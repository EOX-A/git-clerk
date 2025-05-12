<script setup>
import ActionTab from "@/components/global/ActionTab.vue";

const props = defineProps({
  updatedFilePathArr: {
    type: Array,
    default: [],
  },
  goToPath: {
    type: Function,
    default: () => {},
  },
  addFile: {
    type: Function,
    default: () => {},
  },
});
</script>
<template>
  <ActionTab>
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

    <v-menu attach location="bottom">
      <template v-slot:activator="{ props }">
        <v-btn
          color="primary"
          variant="flat"
          v-bind="props"
          class="ml-2"
          prepend-icon="mdi-plus"
        >
          Add File
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item
          prepend-icon="mdi-file-plus-outline"
          title="Add file here"
          @click="addFile"
        />
        <v-list-item prepend-icon="mdi-upload" title="Upload file here" />
      </v-list>
    </v-menu>
  </ActionTab>
</template>
