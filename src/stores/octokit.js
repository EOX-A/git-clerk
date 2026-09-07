import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { FORK_LOCATION, SESSIONS_SCOPE_ALL } from "@/enums";

const useOctokitStore = defineStore("octokit", () => {
  const githubConfig = ref(null);
  const githubUserData = ref(null);
  const githubOrgData = ref(null);
  const octokit = ref(null);
  const sessionsScope = ref(null);

  function setOctokit(instance) {
    githubConfig.value = instance?.githubConfig;
    githubUserData.value = instance?.githubUserData;
    githubOrgData.value = instance?.githubOrgData;
    octokit.value = instance?.octokit;
    sessionsScope.value = scopeOptions.value.some(
      (option) => option.type === "all",
    )
      ? SESSIONS_SCOPE_ALL
      : instance?.githubUserData?.login || null;
  }

  function setForkedRepoStatus(data, index) {
    githubOrgData.value[index] = {
      ...githubOrgData.value[index],
      forked: data,
    };
  }

  function setSessionsScope(owner) {
    sessionsScope.value = owner;
  }

  const forkOptions = computed(() => {
    if (!githubOrgData.value) return [];

    return githubOrgData.value
      .map((entry, index) => {
        const isPersonal = index === 0;
        const owner = isPersonal ? entry.login : entry.organization.login;
        const forked = entry.forked || null;
        const isAdmin =
          isPersonal ||
          entry.role === "admin" ||
          Boolean(forked?.permissions?.admin);
        const canPush =
          isPersonal || isAdmin || !forked || Boolean(forked.permissions?.push);

        return {
          owner,
          name: isPersonal ? "Personal" : owner,
          type: isPersonal ? "personal" : "org",
          role: isPersonal ? "owner" : isAdmin ? "admin" : "member",
          collaborator: Boolean(entry.collaborator),
          forkExists: Boolean(forked),
          canCreateFork: isAdmin && !entry.collaborator,
          canPush,
        };
      })
      .filter((option) => {
        if (option.type === "personal") return FORK_LOCATION.personal !== false;
        // Read-only collaborators on an existing org fork cannot create branches
        return Boolean(FORK_LOCATION.org) && option.canPush;
      });
  });

  const scopeOptions = computed(() => {
    const forked = forkOptions.value.filter(
      (option) => option.type === "personal" || option.forkExists,
    );
    if (forked.length < 2) return forked;
    return [
      {
        owner: SESSIONS_SCOPE_ALL,
        name: "All Repos",
        type: "all",
        forkExists: true,
      },
      ...forked,
    ];
  });

  const selectedScopeOption = computed(
    () =>
      scopeOptions.value.find(
        (option) => option.owner === sessionsScope.value,
      ) ||
      forkOptions.value.find(
        (option) => option.owner === sessionsScope.value,
      ) ||
      forkOptions.value[0],
  );

  const isOrgScope = computed(
    () =>
      selectedScopeOption.value?.type === "org" ||
      selectedScopeOption.value?.type === "all",
  );

  const scopeOwners = computed(() => {
    if (selectedScopeOption.value?.type === "all") {
      return scopeOptions.value
        .filter((option) => option.type !== "all")
        .map((option) => option.owner);
    }
    return selectedScopeOption.value ? [selectedScopeOption.value.owner] : [];
  });

  return {
    githubConfig,
    githubUserData,
    githubOrgData,
    octokit,
    sessionsScope,
    forkOptions,
    scopeOptions,
    selectedScopeOption,
    isOrgScope,
    scopeOwners,
    setOctokit,
    setForkedRepoStatus,
    setSessionsScope,
  };
});

export default useOctokitStore;
