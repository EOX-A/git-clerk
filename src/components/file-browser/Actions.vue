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
  </ActionTab>
</template>
