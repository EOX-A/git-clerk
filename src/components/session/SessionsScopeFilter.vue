<script setup>
import { defineProps } from "vue";

const props = defineProps({
  sessions: {
    type: Array,
    default: null,
  },
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

const scopeIcon = (option) => {
  if (option?.type === "all") return "mdi-source-repository-multiple";
  if (option?.type === "org") return "mdi-account-group";
  return "mdi-account";
};

const roleOf = (option) => {
  if (option.unfiltered) return "Every pull request, native and forks";
  if (option.type === "all") return "Personal and organisation forks";
  if (option.type === "personal") return "Your fork";
  if (option.collaborator)
    return option.role === "admin" ? "Admin (collaborator)" : "Collaborator";
  return option.role === "admin" ? "Admin" : "Member";
};
</script>

<template>
  <v-menu location="bottom">
    <template v-slot:activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        :prepend-icon="scopeIcon(selectedScopeOption)"
        append-icon="mdi-chevron-down"
        variant="tonal"
        size="x-large"
        color="blue-grey-darken-4"
        class="sessions-scope-btn text-capitalize font-weight-medium"
        :text="selectedScopeOption?.name || 'Personal'"
        :disabled="!props.sessions"
      ></v-btn>
    </template>
    <v-list class="pa-0 sessions-scope-list" density="compact">
      <v-list-item
        v-for="option in forkOptions"
        :key="option.owner"
        :title="option.name"
        :prepend-icon="scopeIcon(option)"
        :active="option.owner === selectedScopeOption?.owner"
        :class="`sessions-scope-item scope-${option.owner}`"
        @click="changeSessionScope(option.owner)"
      >
        <template v-slot:subtitle>
          <template v-if="option.fullName">{{ option.fullName }} · </template>
          <strong>{{ roleOf(option) }}</strong>
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
