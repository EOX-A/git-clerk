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

const { githubUserData, githubConfig } = storeToRefs(useOctokitStore());

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

const isUpstream = computed(
  () => forkOwner.value === githubConfig.value?.username,
);
</script>

<template>
  <v-chip
    v-if="forkOwner && !isPersonal"
    color="primary"
    :size="size"
    :prepend-icon="
      isPersonal
        ? 'mdi-account'
        : isUpstream
          ? 'mdi-source-branch'
          : 'mdi-account-group'
    "
    :class="`session-origin-chip px-3 ${isPersonal ? 'origin-personal' : 'origin-org'}`"
    rounded
  >
    <template v-if="isPersonal">Personal</template>
    <span v-else-if="isUpstream" class="d-flex align-center ga-1"
      ><strong>Repo: </strong>{{ forkOwner }}</span
    >
    <span v-else class="d-flex align-center ga-1"
      ><strong>Org: </strong>{{ forkOwner }}</span
    >
  </v-chip>
</template>
