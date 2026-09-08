import useOctokitStore from "@/stores/octokit";

export default function canManageSession(session) {
  if (!session) return false;

  const { githubUserData, forkOptions, isRepoMember } = useOctokitStore();
  if (isRepoMember) return true;

  const forkOwner =
    session.head?.repo?.owner?.login ||
    session.headRepositoryOwner?.login ||
    session.forkOwner;
  if (forkOwner === githubUserData?.login) return true;

  const option = (forkOptions || []).find(
    (item) => item.type === "org" && item.owner === forkOwner,
  );
  if (!option) return true;
  return Boolean(option.canPush);
}
