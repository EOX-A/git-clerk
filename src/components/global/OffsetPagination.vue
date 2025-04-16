<script setup>
import { defineProps } from "vue";

const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  totalPage: {
    type: Number,
    default: 0,
  },
  onPageChange: Function,
});
</script>

<template>
  <div class="text-center border-t-thin py-6">
    <v-pagination
      v-model="props.page"
      :length="props.totalPage"
      @update:model-value="props.onPageChange"
      density="comfortable"
      total-visible="6"
      color="primary"
      next-icon="mdi-menu-right"
      prev-icon="mdi-menu-left"
    ></v-pagination>
  </div>
</template>
