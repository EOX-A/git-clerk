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
    default: "x-small",
  },
});

const { githubUserData } = storeToRefs(useOctokitStore());

const authorLogin = computed(
  () =>
    props.session?.authorLogin ||
    props.session?.author?.login ||
    props.session?.user?.login ||
    null,
);

const isCurrentUser = computed(
  () => authorLogin.value === githubUserData.value?.login,
);
</script>

<template>
  <span>
    by <strong>@{{ isCurrentUser ? "You" : authorLogin }}</strong>
  </span>
</template>
