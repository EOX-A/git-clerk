import { defineStore } from "pinia";
import { computed, reactive, shallowRef } from "vue";
import { gitBrokerConfig, resolveBrokerUser } from "../api/git-broker.js";

export default defineStore("git-v2", () => {
  const config = gitBrokerConfig();
  const context = shallowRef(null);
  const fallbackUser = config.user;
  const hasEnvironmentProfile = [
    fallbackUser.name,
    fallbackUser.email,
    fallbackUser.username,
  ].every(Boolean);
  const hasLuigiProfile = shallowRef(false);
  const showAccountMenu = computed(
    () => hasEnvironmentProfile && !hasLuigiProfile.value,
  );
  // The sidebar and an already connected broker share the same profile.
  const user = reactive({ ...fallbackUser });
  config.user = user;

  function setContext(value) {
    context.value = value;
  }

  function setUser(profile) {
    const luigiUser = resolveBrokerUser(profile);
    hasLuigiProfile.value = Object.values(luigiUser).some(Boolean);
    Object.assign(user, resolveBrokerUser(luigiUser, fallbackUser));
  }

  return { config, context, user, showAccountMenu, setContext, setUser };
});
