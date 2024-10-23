// config.js
globalThis.ghConfig = {
  githubOwner: "",
  githubRepo: "",
  githubAuthToken: async () => {
    async function getGithubAuthToken() {
      // Fetch GitHub Token through API or through event listeners or through other functions
      return ""; // return the token here
    }

    return await getGithubAuthToken();
  },
};
