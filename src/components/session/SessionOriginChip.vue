<script setup>
import { computed, defineProps } from "vue";
import useOctokitStore from "@/stores/octokit";
import { storeToRefs } from "pinia";

const props = defineProps({
  session: {
    type: Object,
    default: {},
  },
  size: {
    type: String,
    default: "small",
  },
});

const { githubUserData } = storeToRefs(useOctokitStore());

const forkOwner = computed(
  () =>
    props.session?.forkOwner ||
    props.session?.headRepositoryOwner?.login ||
    props.session?.head?.repo?.owner?.login ||
    null,
);

const isPersonal = computed(
  () => forkOwner.value === githubUserData.value?.login,
);
</script>

<template>
  <v-chip
    v-if="forkOwner && !isPersonal"
    color="primary"
    :size="size"
    :prepend-icon="isPersonal ? 'mdi-account' : 'mdi-account-group'"
    :class="`session-origin-chip px-3 ${isPersonal ? 'origin-personal' : 'origin-org'}`"
    rounded
  >
    <template v-if="isPersonal">Personal</template>
    <span v-else class="d-flex align-center ga-1"
      ><strong>Org: </strong>{{ forkOwner }}</span
    >
  </v-chip>
</template>
