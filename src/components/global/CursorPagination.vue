<script setup>
import { defineProps } from "vue";

const props = defineProps({
  pageInfo: {
    type: Object,
    default: null,
  },
  onPageChange: Function,
});
</script>

<template>
  <div
    v-if="props.pageInfo"
    class="text-center border-t-thin py-6 d-flex justify-center align-center ga-4"
  >
    <v-btn
      :disabled="!props.pageInfo.hasPreviousPage"
      @click="props.onPageChange('startCursor')"
      icon="mdi-menu-left"
      color="primary"
      size="small"
      variant="tonal"
    >
    </v-btn>
    <v-btn
      :disabled="!props.pageInfo.hasNextPage"
      @click="props.onPageChange('endCursor')"
      icon="mdi-menu-right"
      size="small"
      color="primary"
      variant="tonal"
    >
    </v-btn>
  </div>
</template>
