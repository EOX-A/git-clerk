import { defineStore } from "pinia";
import { shallowRef } from "vue";
import { gitBrokerConfig } from "../api/git-broker.js";

export default defineStore("git-v2", () => {
  const config = gitBrokerConfig();
  const context = shallowRef(null);
  const user = config.user;

  function setContext(value) {
    context.value = value;
  }

  return { config, context, user, setContext };
});
