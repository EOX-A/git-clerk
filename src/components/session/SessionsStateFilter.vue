<script setup>
import { defineProps } from "vue";

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
  <v-btn
    prepend-icon="mdi-source-pull"
    :variant="sessionSelectedState === 'open' ? 'tonal' : 'text'"
    size="x-large"
    text="Open"
    color="blue-grey-darken-4 open-session-btn"
    id="session-action-menu"
    :disabled="!props.sessions"
    @click="changeSessionState('open')"
  >
    <template v-slot:append>
      <v-chip
        variant="tonal"
        color="secondary"
        class="rounded-pill font-weight-bold open-session-chip"
      >
        <span v-if="!numberOfOpenClosedSessions" class="count-shimmer"></span>
        <template v-else>{{ numberOfOpenClosedSessions.open || "-" }}</template>
      </v-chip>
    </template>
  </v-btn>

  <v-btn
    prepend-icon="mdi-check-circle-outline"
    :variant="sessionSelectedState === 'closed' ? 'tonal' : 'text'"
    size="x-large"
    text="Closed"
    color="blue-grey-darken-4 closed-session-btn"
    id="session-action-menu"
    :disabled="!props.sessions"
    @click="changeSessionState('closed')"
  >
    <template v-slot:append>
      <v-chip
        variant="tonal"
        color="red"
        class="rounded-pill font-weight-bold closed-session-chip"
      >
        <span v-if="!numberOfOpenClosedSessions" class="count-shimmer"></span>
        <template v-else>{{
          numberOfOpenClosedSessions.closed || "-"
        }}</template>
      </v-chip>
    </template>
  </v-btn>
</template>

<style>
.count-shimmer {
  display: inline-block;
  width: 18px;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.08) 25%,
    rgba(0, 0, 0, 0.2) 50%,
    rgba(0, 0, 0, 0.08) 75%
  );
  background-size: 200% 100%;
  animation: count-shimmer 1.2s ease-in-out infinite;
}
@keyframes count-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
