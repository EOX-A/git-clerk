<script setup>
import { defineProps, computed } from "vue";

const props = defineProps({
  pageInfo: {
    type: Object,
    default: null,
  },
  onPageChange: Function,
  currentPage: {
    type: Number,
    default: 1,
  },
  cursorHistory: {
    type: Array,
    default: [],
  },
});

const totalPages = computed(() => {
  if (
    !props.pageInfo ||
    (props.currentPage === 1 && !props.pageInfo.hasNextPage)
  )
    return 1;
  return props.cursorHistory.length;
});

const handlePageChange = (page) => {
  props.onPageChange(page);
};
</script>

<template>
  <div
    v-if="props.pageInfo"
    class="text-center border-t-thin py-6 d-flex justify-center align-center"
  >
    <v-pagination
      :model-value="currentPage"
      :length="totalPages"
      :total-visible="4"
      @update:model-value="
        (page) => page !== currentPage && handlePageChange(page)
      "
      density="comfortable"
      color="primary"
    >
      <template v-slot:prev>
        <v-btn
          :disabled="!props.pageInfo.hasPreviousPage"
          icon="mdi-menu-left"
          color="primary"
          density="comfortable"
          variant="text"
          rounded="default"
          @click="handlePageChange('startCursor')"
        />
      </template>
      <template v-slot:next>
        <v-btn
          :disabled="!props.pageInfo.hasNextPage"
          icon="mdi-menu-right"
          color="primary"
          density="comfortable"
          rounded="default"
          variant="text"
          @click="handlePageChange('endCursor')"
        />
      </template>
    </v-pagination>
  </div>
</template>
