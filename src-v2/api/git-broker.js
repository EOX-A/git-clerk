const setting = (value) => (typeof value === "string" ? value.trim() : "");

export function resolveBrokerUser(profile, fallback = {}) {
  return {
    name: setting(profile?.name) || setting(fallback.name),
    email: setting(profile?.email) || setting(fallback.email),
    username: setting(profile?.username) || setting(fallback.username),
  };
}

export function gitBrokerConfig(root = globalThis, env = import.meta.env) {
  const config = root.gitClerkConfig || {};
  return {
    baseUrl: (config.gitBrokerUrl ?? "http://localhost:8015").replace(
      /\/+$/,
      "",
    ),
    provider: config.gitBroker?.provider,
    repo: config.gitBroker?.repo,
    user: resolveBrokerUser({
      name: env?.GITCLERK_PROFILE_NAME,
      email: env?.GITCLERK_EMAIL,
      username: env?.GITCLERK_USERNAME,
    }),
  };
}

export function brokerBranchPrefix(user) {
  const slug = user.username
    ?.toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `session/${slug}/` : "";
}

export function brokerAuthor(context) {
  const { name, email, username } = context.user;
  if (!name || !email || !username)
    throw Object.assign(
      new Error(
        "Set GITCLERK_PROFILE_NAME, GITCLERK_EMAIL and GITCLERK_USERNAME before writing files.",
      ),
      { status: 400, code: "BROKER_AUTHOR_REQUIRED" },
    );
  return { name, email, username };
}

export function createGitBrokerRequest(config, fetchImpl = globalThis.fetch) {
  return async (path, { method = "GET", query, body, signal, branch } = {}) => {
    const target = Object.fromEntries(
      Object.entries({ provider: config.provider, repo: config.repo }).filter(
        ([, value]) => value,
      ),
    );
    const params = new URLSearchParams({
      ...(body === undefined ? target : {}),
      ...query,
    });
    const response = await fetchImpl(
      `${config.baseUrl}/api/git${path}${params.size ? `?${params}` : ""}`,
      {
        method,
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(branch ? { "X-Git-Session-Branch": branch } : {}),
        },
        signal,
        ...(body === undefined
          ? {}
          : { body: JSON.stringify({ ...target, ...body }) }),
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw Object.assign(
        new Error(
          typeof data?.detail === "string"
            ? data.detail
            : `Git broker request failed (HTTP ${response.status}).`,
        ),
        { status: response.status },
      );
    }
    const result = await response.json();
    signal?.throwIfAborted();
    if (method !== "GET" && result.mode === "sandbox_dry_run")
      throw Object.assign(
        new Error(
          "The Git broker simulated this write. Configure provider credentials on the broker.",
        ),
        { status: 400, code: "BROKER_DRY_RUN" },
      );
    return result;
  };
}

export async function initGitBroker(config = gitBrokerConfig(), fetchImpl) {
  const request = createGitBrokerRequest(config, fetchImpl);
  const repository = await request("/repo").catch((error) => {
    if (error.status === 404) error.code = "BROKER_REPO_UNAVAILABLE";
    throw error;
  });
  if (!repository.repo || !repository.default_branch)
    throw new Error(
      "The Git broker did not return a repository and default branch.",
    );
  return { config, repository, user: config.user, request };
}

export function publishGitBundle(context, body, session) {
  const provider = context.repository.provider || context.config?.provider;
  return context.request("/publish", {
    method: "POST",
    branch: session?.branch,
    body: {
      ...body,
      // The GitHub broker builds from base_branch and looks up an existing PR on 422.
      // The other providers commit against the target branch directly.
      base_branch:
        session && (!provider || provider === "github")
          ? session.branch
          : session?.baseBranch || context.repository.default_branch,
      author: brokerAuthor(context),
    },
  });
}
