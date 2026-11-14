import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

const useOctokitStore = defineStore("octokit-v2", () => {
  const context = shallowRef(null);
  const githubUserData = computed(() => context.value?.githubUserData || null);

  function setOctokit(instance) {
    context.value = instance;
  }

  return { context, githubUserData, setOctokit };
});

export default useOctokitStore;
