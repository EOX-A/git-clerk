// Match the existing backend's prompt perimeter. Context uses its history field.
const PROMPT_PREFIX =
  'Complete linked STAC/OSC JSON files, no Git writes. Return {"message":"reply","draft":null}; for edits draft={"title":"PR title","files":{"relative/path.json":{}}}. Message first.\nRequest: ';
const characterCount = (value) => Array.from(value).length;

export function buildOscPrompt(message) {
  const text = message.trim();
  if (!text) throw new Error("Enter a message before sending.");
  const prompt = PROMPT_PREFIX + text;
  const withoutURLs = prompt.replace(/https?:\/\/\S+/g, "").trim();
  if (characterCount(prompt) > 1000 || characterCount(withoutURLs) > 400)
    throw new Error(
      `Keep your message within ${400 - characterCount(PROMPT_PREFIX)} characters, excluding URLs (1000 characters total including request formatting). The backend limits prompt text to 400 characters.`,
    );
  return prompt;
}

export function buildOscHistory(history = [], draft) {
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
      content: `Current OSC draft in Git Clerk. Preserve existing paths, IDs and unmentioned fields. Return complete contents for changed files only; unlisted files stay unchanged.\n${JSON.stringify(draft)}`,
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
export function parseOscReply(payload) {
  if (payload?.data && typeof payload.data === "object") return payload.data;
  const message = payload?.message;
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
        return value;
    } catch {
      /* Ordinary conversational replies are allowed without a file draft. */
    }
  }
  if (/^\s*\{|^\s*```(?:json)?\s*\{/i.test(text)) return null;
  return { message, draft: null };
}
