import { defineStore } from "pinia";
import { ref } from "vue";

const useOctokitStore = defineStore("octokit", () => {
  const githubConfig = ref(null);
  const githubUserData = ref(null);
  const octokit = ref(null);

  function setOctokit(instance) {
    githubConfig.value = instance?.githubConfig;
    githubUserData.value = instance?.githubUserData;
    octokit.value = instance?.octokit;
  }

  return {
    githubConfig,
    githubUserData,
    octokit,
    setOctokit,
  };
});

export default useOctokitStore;
