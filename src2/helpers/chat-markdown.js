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
    return url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      url.pathname.endsWith(`/pull/${pr.number}`)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
