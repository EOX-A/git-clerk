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
        {{ numberOfOpenClosedSessions?.open || "-" }}
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
        {{ numberOfOpenClosedSessions?.closed || "-" }}
      </v-chip>
    </template>
  </v-btn>
</template>
