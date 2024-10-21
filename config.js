// config.js
const config = {
  githubOwner: import.meta.env.VUE_APP_GITHUB_OWNER || "",
  githubRepo: import.meta.env.VUE_APP_GITHUB_REPO || "",
  githubAuthToken: async () => {
    async function getGithubAuthToken() {
      // Fetch GitHub Token through API or through event listeners or through other functions
      return ""; // return the token here
    }

    return import.meta.env.VUE_APP_GITHUB_TOKEN || (await getGithubAuthToken());
  },
};

export default config;
