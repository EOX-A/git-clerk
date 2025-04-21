<script setup>
import { defineProps } from "vue";
import SessionsStateFilter from "./SessionsStateFilter.vue";
import ActionTab from "@/components/global/ActionTab.vue";

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
  <ActionTab>
    <SessionsStateFilter
      :sessions="sessions"
      :numberOfOpenClosedSessions="numberOfOpenClosedSessions"
      :sessionSelectedState="sessionSelectedState"
      :changeSessionState="changeSessionState"
    />
  </ActionTab>
</template>
