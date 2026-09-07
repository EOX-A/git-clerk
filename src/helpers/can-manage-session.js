import useOctokitStore from "@/stores/octokit";

export default function canManageSession(session) {
  if (!session) return false;

  const { githubUserData, forkOptions } = useOctokitStore();
  const forkOwner =
    session.head?.repo?.owner?.login ||
    session.headRepositoryOwner?.login ||
    session.forkOwner;
  const option = (forkOptions || []).find(
    (item) => item.type === "org" && item.owner === forkOwner,
  );

  if (!option) return true;
  if (option.role === "admin") return true;

  const author =
    session.author?.login || session.user?.login || session.authorLogin;
  return Boolean(author) && author === githubUserData?.login;
}
