import { getChatConfig } from "./chat-config.js";
import { chatOutputPath } from "./chat-output.js";
// Match the existing backend's prompt perimeter. Context uses its history field.
const characterCount = (value) => Array.from(value).length;

export function buildChatPrompt(message, config = getChatConfig()) {
  const fileExample = JSON.stringify(config.preset.fileExample);
  const prefix = config.preset.outputFile
    ? `${config.preset.promptInstructions}. No Git writes.\nRequest: `
    : `${config.preset.promptInstructions}, no Git writes. Return {"message":"reply","draft":null}; for edits draft={"title":"PR title","files":${fileExample}}. Message first.\nRequest: `;
  const text = message.trim();
  if (!text) throw new Error("Enter a message before sending.");
  const prompt = prefix + text;
  const withoutURLs = prompt.replace(/https?:\/\/\S+/g, "").trim();
  if (characterCount(prompt) > 1000 || characterCount(withoutURLs) > 400)
    throw new Error(
      `Keep your message within ${Math.max(0, 400 - characterCount(prefix))} characters, excluding URLs (1000 characters total including request formatting). The backend limits prompt text to 400 characters.`,
    );
  return prompt;
}

export function buildChatHistory(history = [], draft) {
  const context = history
    .filter(
      ({ role, content }) =>
        ["user", "assistant"].includes(role) && typeof content === "string",
    )
    .slice(draft ? -39 : -40)
    .map(({ role, content }) => ({ role, content }));
  if (draft)
    context.push({
      role: "user",
      content: `Current draft in Git Clerk. Preserve existing paths, IDs and unmentioned fields. Return complete contents for changed files only; unlisted files stay unchanged.\n${JSON.stringify(draft)}`,
    });
  return context;
}

// Chat may append grounded citations after a JSON reply.
function leadingObject(text) {
  if (!text.startsWith("{")) return "";
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return text.slice(0, i + 1);
  }
  return "";
}

// The existing chat profile returns text, including JSON requested in the prompt.
export function parseChatReply(
  payload,
  config = getChatConfig(),
  outputPath = null,
) {
  if (
    payload?.error ||
    ["error", "failed", "refused"].includes(payload?.status)
  )
    return null;
  if (
    [
      payload?.message,
      payload?.text,
      payload?.raw_text,
      payload?.markdown,
    ].some(
      (value) =>
        typeof value === "string" &&
        /^\s*\[(Error|Exception|Output blocked):/.test(value),
    )
  )
    return null;
  const reference = [payload, payload?.draft].find(
    (value) => typeof value?.id === "string" && typeof value.title === "string",
  );
  const identity = reference
    ? { id: reference.id, title: reference.title }
    : null;
  const withIdentity = (reply) => {
    if (!identity) return reply;
    return reply.draft
      ? { ...reply, draft: { ...reply.draft, ...identity } }
      : { ...reply, draftIdentity: identity };
  };
  if (
    typeof payload?.message === "string" &&
    "draft" in payload &&
    (!identity ||
      payload.draft === null ||
      Object.hasOwn(payload.draft ?? {}, "files"))
  )
    return withIdentity(payload);
  if (typeof payload?.data?.message === "string" && "draft" in payload.data)
    return withIdentity(payload.data);
  // Raw-output profiles need an explicit destination; never guess a repository path.
  if (config.preset.outputFile) {
    const content =
      config.preset.output_format === "a2ui"
        ? (payload?.components ?? payload?.data)
        : (payload?.markdown ??
          payload?.data ??
          payload?.message ??
          payload?.text ??
          payload?.raw_text ??
          payload?.components);
    if (content === undefined || content === null || content === "")
      return null;
    const path =
      outputPath ||
      chatOutputPath(config.preset.outputFile, null, identity?.id);
    if (!path)
      throw new Error(
        "The backend did not return a valid draft ID for the configured output path.",
      );
    return withIdentity({
      message: "Changes are ready.",
      draft: {
        title: config.preset.ui.sessionTitle,
        files: { [path]: content },
      },
    });
  }
  const message =
    payload?.message ??
    payload?.text ??
    payload?.markdown ??
    payload?.raw_text ??
    (typeof payload?.data === "string" ? payload.data : null);
  if (typeof message !== "string" || !message.trim()) return null;
  const text = message.trim();
  const candidates = [
    text,
    leadingObject(text),
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (match) =>
      match[1].trim(),
    ),
  ];
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value.message === "string" && "draft" in value)
        return withIdentity(value);
    } catch {
      /* Ordinary conversational replies are allowed without a file draft. */
    }
  }
  if (/^\s*\{|^\s*```(?:json)?\s*\{/i.test(text)) return null;
  return withIdentity({ message, draft: null });
}
