<script setup>
import { defineProps } from "vue";
import SessionsStateFilter from "./SessionsStateFilter.vue";
import ActionTab from "@/components/global/ActionTab.vue";

defineProps({
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
      :number-of-open-closed-sessions="numberOfOpenClosedSessions"
      :session-selected-state="sessionSelectedState"
      :change-session-state="changeSessionState"
    />
  </ActionTab>
</template>
