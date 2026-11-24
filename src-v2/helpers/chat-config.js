// One deployment selects one preset. Read config at call/setup time, after config-v2.js.
export function getChatConfig(root = globalThis) {
  const chat = root.gitClerkConfig?.chat || {};
  const preset = chat.preset || {};
  return {
    enabled: chat.enabled ?? true,
    backend: {
      baseUrl: (chat.backend?.baseUrl ?? "http://localhost:8000").replace(
        /\/+$/,
        "",
      ),
      stream: chat.backend?.stream ?? true,
    },
    features: {
      attachments: false,
      modelSelector: false,
      manualSessionCreation: true,
      ...chat.features,
    },
    publishing: {
      enabled: true,
      automatic: true,
      updateExistingSession: true,
      prTitle: preset.prTitle ?? "<title> (<username>)",
      prBody:
        preset.prBody ??
        "Content generated in Git Clerk. Schema validation has not been performed.",
      ...chat.publishing,
    },
    preset: {
      projectId: undefined,
      profile: "chat",
      output_format: "text_and_a2ui",
      promptInstructions: "Create or edit complete repository files",
      fileExample: { "relative/path": "complete file text" },
      outputFile: null,
      models: [
        {
          label: "Auto",
          value: "",
          description: "Use the backend's default model",
        },
      ],
      ...preset,
      context: {
        extensions: [],
        inputField: null,
        ...preset.context,
      },
      ui: {
        assistantName: "Git Clerk",
        panelTitle: "Git Clerk AI Assistant",
        heading: "What would you like to change?",
        description: "",
        placeholder: "Describe a change to your repository…",
        followUpPlaceholder: "Ask for another change…",
        sessionTitle: "New session",
        welcome:
          "What would you like to edit or add? Tell me what you have in mind, or explore the current changes below.",
        readOnlyWelcome:
          "This session is read-only. You can explore its files and review the current PR below.",
        generating: "Preparing your changes…",
        footer:
          chat.publishing?.enabled === false
            ? "Chat stays in this app session."
            : chat.publishing?.automatic === false
              ? "Review the generated files, then save your draft."
              : "Files are saved to a draft pull request. Chat stays in this app session.",
        disabledMessage: "AI chat is disabled for this instance.",
        suggestions: [],
        ...preset.ui,
      },
    },
  };
}

export function chatScopeKey(config = getChatConfig()) {
  return JSON.stringify([
    config.backend.baseUrl,
    config.preset.projectId,
    config.preset.profile,
    config.preset.output_format,
    config.preset.promptInstructions,
    config.preset.fileExample,
    config.preset.context,
    config.preset.outputFile,
  ]);
}

export function chatContextIncludes(path, config = getChatConfig()) {
  const extensions = config.preset.context.extensions;
  return (
    !extensions.length ||
    extensions.some((extension) =>
      path.toLowerCase().endsWith(extension.toLowerCase()),
    )
  );
}

export function chatContextContent(text, path) {
  if (path.toLowerCase().endsWith(".json")) {
    try {
      return JSON.parse(text);
    } catch {
      /* Preserve incomplete JSON as source text. */
    }
  }
  return text;
}

const DEFAULT_MEDIA_MAX_FILE_SIZE = 25 * 1024 * 1024;
const DEFAULT_MEDIA_MAX_FILES = 10;

export function getMediaUploadConfig(root = globalThis) {
  const config = root.gitClerkConfig || {};
  const mediaUpload = config.mediaUpload || {};
  const chatAttachments = config.chat?.features?.attachments ?? false;
  return {
    enabled: mediaUpload.enabled ?? chatAttachments,
    target: mediaUpload.target ?? "repo",
    path: String(mediaUpload.path ?? "assets").replace(/^\/+|\/+$/g, ""),
    maxFileSize:
      typeof mediaUpload.maxFileSize === "number" && mediaUpload.maxFileSize > 0
        ? mediaUpload.maxFileSize
        : DEFAULT_MEDIA_MAX_FILE_SIZE,
    maxFiles:
      typeof mediaUpload.maxFiles === "number" && mediaUpload.maxFiles > 0
        ? mediaUpload.maxFiles
        : DEFAULT_MEDIA_MAX_FILES,
    urlTemplate: mediaUpload.urlTemplate ?? null,
    bucket: mediaUpload.bucket || null,
    customUpload:
      typeof mediaUpload.customUpload === "function"
        ? mediaUpload.customUpload
        : null,
  };
}
