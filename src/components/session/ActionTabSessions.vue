<script setup>
import { defineProps } from "vue";
import SessionsStateFilter from "./SessionsStateFilter.vue";
import SessionsScopeFilter from "./SessionsScopeFilter.vue";
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
  forkOptions: {
    type: Array,
    default: [],
  },
  selectedScopeOption: {
    type: Object,
    default: null,
  },
  changeSessionScope: Function,
});
</script>

<template>
  <ActionTab>
    <template v-if="forkOptions.length > 1">
      <SessionsScopeFilter
        :sessions="sessions"
        :forkOptions="forkOptions"
        :selectedScopeOption="selectedScopeOption"
        :changeSessionScope="changeSessionScope"
      />
      <v-divider inset vertical></v-divider>
    </template>
    <SessionsStateFilter
      :sessions="sessions"
      :numberOfOpenClosedSessions="numberOfOpenClosedSessions"
      :sessionSelectedState="sessionSelectedState"
      :changeSessionState="changeSessionState"
    />
  </ActionTab>
</template>
