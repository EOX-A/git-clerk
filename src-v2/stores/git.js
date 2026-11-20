import { defineStore } from "pinia";
import { reactive, shallowRef } from "vue";
import { gitBrokerConfig, resolveBrokerUser } from "../api/git-broker.js";

export default defineStore("git-v2", () => {
  const config = gitBrokerConfig();
  const context = shallowRef(null);
  const fallbackUser = config.user;
  // The sidebar and an already connected broker share the same profile.
  const user = reactive({ ...fallbackUser });
  config.user = user;

  function setContext(value) {
    context.value = value;
  }

  function setUser(profile) {
    Object.assign(user, resolveBrokerUser(profile, fallbackUser));
  }

  return { config, context, user, setContext, setUser };
});
