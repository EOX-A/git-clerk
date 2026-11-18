// Replies are untrusted text: allow web links, but no remote images or active HTML.
export const chatMarkdownSecurity = {
  allowedProtocols: ["https", "http", "mailto"],
  allowedLinkPrefixes: ["*"],
  allowedImagePrefixes: [],
  allowDataImages: false,
};
export const chatMarkdownParser = {
  registerDefaultPlugins: false,
};

export function chatPullRequestUrl(pr) {
  try {
    const url = new URL(pr.url);
    const repository = pr.repositoryUrl ? new URL(pr.repositoryUrl) : null;
    const route =
      { gitlab: "/-/merge_requests/", forgejo: "/pulls/" }[pr.provider] ||
      "/pull/";
    return ["https:", "http:"].includes(url.protocol) &&
      (repository
        ? url.origin === repository.origin &&
          url.pathname ===
            `${repository.pathname.replace(/\/$/, "")}${route}${pr.number}`
        : url.protocol === "https:" && url.hostname === "github.com") &&
      !url.username &&
      !url.password &&
      url.pathname.endsWith(`${route}${pr.number}`)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
