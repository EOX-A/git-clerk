<script setup>
import { defineProps } from "vue";
import SessionsStateFilter from "./SessionsStateFilter.vue";

const props = defineProps({
  sessions: {
    type: Array,
    default: null,
  },
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
      :sessions="sessions"
      :numberOfOpenClosedSessions="numberOfOpenClosedSessions"
      :sessionSelectedState="sessionSelectedState"
      :changeSessionState="changeSessionState"
    />
  </div>
</template>
