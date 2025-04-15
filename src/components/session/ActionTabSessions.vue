<script setup>
import { defineProps } from "vue";
import SessionsStateFilter from "./SessionsStateFilter.vue";

const props = defineProps({
  numberOfOpenClosedSessions: {
    type: Object,
    default: null,
  },
  sessionSelectedState: {
    type: String,
    default: "open",
  },
  changeSessionState: Function,
});
</script>

<template>
  <div
    class="bg-surface-light px-0 px-sm-5 py-4 d-flex align-center ga-4 action-tab position-relative"
  >
    <SessionsStateFilter
      :numberOfOpenClosedSessions="numberOfOpenClosedSessions"
      :sessionSelectedState="sessionSelectedState"
      :changeSessionState="changeSessionState"
    />
  </div>
</template>
