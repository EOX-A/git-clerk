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
    prepend-icon="mdi-lock-open-variant-outline"
    :variant="sessionSelectedState === 'open' ? 'tonal' : 'text'"
    size="x-large"
    text="Open"
    color="blue-grey-darken-4"
    id="session-action-menu"
    :disabled="!props.sessions"
    @click="changeSessionState('open')"
  >
    <template v-slot:append>
      <v-chip
        variant="tonal"
        color="secondary"
        class="rounded-pill font-weight-bold"
      >
        {{ numberOfOpenClosedSessions?.open || "-" }}
      </v-chip>
    </template>
  </v-btn>

  <v-btn
    prepend-icon="mdi-lock-outline"
    :variant="sessionSelectedState === 'closed' ? 'tonal' : 'text'"
    size="x-large"
    text="Closed"
    color="blue-grey-darken-4"
    id="session-action-menu"
    :disabled="!props.sessions"
    @click="changeSessionState('closed')"
  >
    <template v-slot:append>
      <v-chip variant="tonal" color="red" class="rounded-pill font-weight-bold">
        {{ numberOfOpenClosedSessions?.closed || "-" }}
      </v-chip>
    </template>
  </v-btn>
</template>
