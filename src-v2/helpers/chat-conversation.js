import { reactive } from "vue";
import { streamedMessage } from "./event-stream.js";
import { buildChatPrompt } from "./chat-request.js";
import { createChatDraftStream } from "./chat-draft-stream.js";
import { chatOutputPath } from "./chat-output.js";
import { getChatConfig } from "./chat-config.js";

// State belongs to the conversation, so switching from New Session to a PR retains it.
const TOOL_ACTIVITY_LABELS = {
  discover_narrative: "Searching narratives…",
  search_unsplash_image: "Finding imagery…",
  resolve_loremflickr_image: "Finding imagery…",
  web_search: "Searching the web…",
  resolve_doi: "Resolving DOI metadata…",
  search_connected_bucket: "Inspecting dataset…",
};

function toolActivityLabel(toolName) {
  if (!toolName || typeof toolName !== "string") return "Using tools…";
  const normalized = toolName.trim().toLowerCase();
  if (TOOL_ACTIVITY_LABELS[normalized]) return TOOL_ACTIVITY_LABELS[normalized];
  if (normalized.includes("stac") || normalized.includes("catalog"))
    return "Searching satellite catalog…";
  if (normalized.includes("bucket") || normalized.includes("dataset"))
    return "Inspecting dataset…";
  if (normalized.includes("image") || normalized.includes("unsplash"))
    return "Finding imagery…";
  return `Running ${normalized.replace(/_/g, " ")}…`;
}

export function createChatConversation({
  connect,
  generate,
  prepare,
  publish,
  onSaved,
  loadDraft = async () => null,
  config = getChatConfig(),
}) {
  const state = reactive({
    messages: [],
    busy: false,
    phase: "idle",
    progress: "",
    error: "",
    streamingFiles: null,
    draft: null,
    draftIdentity: null,
    pending: null,
    session: null,
    completed: 0,
    savedFiles: [],
    publication: null,
  });
  let controller;
  let saveAttempt = {};
  let assistant;
  let raw = "";

  const errorMethod = (cause) => {
    if (assistant?.files?.length) assistant.fileStage = "failed";
    state.error = ["BROKER_DRY_RUN", "BROKER_AUTHOR_REQUIRED"].includes(
      cause.code,
    )
      ? cause.message
      : cause.status === 403
        ? "The Git broker denied the save. Check your repository access and session branch."
        : cause.status
          ? "The Git broker could not save the draft. Retry saving to check the result."
          : cause.message || "The request failed. Please retry.";
    state.messages.push({
      id: crypto.randomUUID(),
      role: "error",
      text: state.error,
    });
  };
  const saveMethod = async () => {
    if (!config.publishing.enabled)
      throw new Error("Chat publishing is disabled for this instance.");
    if (state.session && !config.publishing.updateExistingSession)
      throw new Error(
        "Chat updates to existing sessions are disabled for this instance.",
      );
    state.phase = "preparing";
    state.progress = "Preparing files for Git…";
    const bundle = await prepare(state.pending, controller.signal);
    controller.signal.throwIfAborted();
    state.phase = "saving";
    if (assistant?.files?.length) assistant.fileStage = "publishing";
    const updating = Boolean(state.session);
    state.progress = state.session
      ? `Updating files in PR #${state.session.number} through the Git broker…`
      : "Creating a draft PR and saving files through the Git broker…";
    const result = await publish(
      bundle,
      saveAttempt,
      state.session ? { ...state.session } : null,
    );
    state.session = { ...result.session, headSha: result.commitSha };
    state.publication = { session: state.session, documents: result.documents };
    state.savedFiles = [
      ...new Set([
        ...state.savedFiles,
        ...result.files.map((file) => file.path),
      ]),
    ];
    state.messages.push({
      id: crypto.randomUUID(),
      role: "assistant",
      text: result.files.length
        ? `Saved ${result.files.length} ${result.files.length === 1 ? "file" : "files"} to PR #${state.session.number}.`
        : "These files already match the session branch.",
      files: result.files.map((file) => ({
        ...file,
        status: "Saved",
        content: bundle.staged_files[file.path],
      })),
      fileStage: "saved",
      pr: {
        updated: updating,
        draft: state.session.status === "draft",
        number: state.session.number,
        title: state.session.title || bundle.draft.title,
        branch: state.session.branch,
        url: state.session.url,
        provider: state.session.provider,
        repositoryUrl: state.session.repositoryUrl,
      },
    });
    // Move the same generated file previews into the confirmed publication message.
    if (assistant) assistant.files = [];
    state.pending = null;
    saveAttempt = {};
    state.completed++;
    onSaved(state.session, state);
  };
  const runMethod = async (payload, session) => {
    const current = new AbortController();
    controller = current;
    state.busy = true;
    state.error = "";
    state.streamingFiles = null;
    try {
      await connect();
      current.signal.throwIfAborted();
      if (payload) {
        const pendingDraft = state.pending;
        state.pending = null;
        if (session) {
          state.phase = "generating";
          state.progress = "Reading the session files…";
          const currentDraft = await loadDraft(session, current.signal);
          current.signal.throwIfAborted();
          if (currentDraft) {
            state.draft = pendingDraft || currentDraft;
            state.savedFiles = Object.keys(currentDraft.files);
          }
        }
        const history = state.messages
          .filter((message) =>
            ["user", "assistant", "error"].includes(message.role),
          )
          .slice(-40)
          .map(({ role, text, historyText }) => ({
            role: role === "error" ? "assistant" : role,
            content: historyText ?? text,
          }));
        state.messages.push({
          id: crypto.randomUUID(),
          role: "user",
          text: payload.text.trim(),
        });
        assistant = reactive({
          id: crypto.randomUUID(),
          role: "assistant",
          text: "",
          streaming: true,
          files: [],
          fileStage: "generating",
        });
        state.messages.push(assistant);
        state.phase = "generating";
        state.progress = config.preset.ui.generating;
        raw = "";
        const streamsMarkdown =
          config.preset.outputFile &&
          config.preset.output_format === "markdown";
        let streamingTargetPath = streamsMarkdown
          ? chatOutputPath(
              config.preset.outputFile,
              state.draft,
              state.draftIdentity?.id,
            )
          : null;
        let lastStreamFlush = 0;
        const activeTools = new Map();
        const readDraftChunk = createChatDraftStream((file) => {
          const index = assistant.files.findIndex(
            (item) => item.path === file.path,
          );
          if (index === -1) assistant.files.push(file);
          else assistant.files[index] = file;
          if (file.content !== undefined) {
            state.streamingFiles = {
              ...(state.streamingFiles || {}),
              [file.path]: file.content,
            };
          }
        });
        const result = await generate(
          {
            prompt: payload.text.trim(),
            history,
            draft: state.draft,
            draftIdentity: state.draftIdentity,
            model: payload.model,
            branch: session?.branch,
            sessionTitle: session?.title,
            onTitle: (identity) => {
              if (current.signal.aborted) return;
              state.draftIdentity = identity;
              if (streamsMarkdown && !raw) {
                streamingTargetPath = chatOutputPath(
                  config.preset.outputFile,
                  state.draft,
                  identity.id,
                );
              }
            },
          },
          (event, data) => {
            if (current.signal.aborted) return;
            if (event === "RUN_STARTED") {
              state.progress = config.preset.ui.generating || "Generating…";
            } else if (event === "TEXT_MESSAGE_CONTENT") {
              raw += data.chunk || "";
              if (raw.length > 2_000_000)
                throw new Error(
                  "The response is too large. Request fewer files at a time.",
                );
              if (!activeTools.size) {
                const lines = raw ? raw.split("\n").length : 0;
                if (streamsMarkdown && lines) {
                  const targetPath =
                    streamingTargetPath || config.preset.outputFile;
                  state.progress = `Generating ${targetPath} (${lines} ${lines === 1 ? "line" : "lines"})…`;
                } else if (lines) {
                  state.progress = `Generating files (${lines} ${lines === 1 ? "line" : "lines"})…`;
                } else {
                  state.progress = config.preset.ui.generating || "Generating…";
                }
              }
              if (streamsMarkdown) {
                const targetPath =
                  streamingTargetPath || config.preset.outputFile;
                assistant.text = `Writing \`${targetPath}\`…`;
                assistant.files = [
                  { path: targetPath, status: "Generating", content: raw },
                ];
                const now = Date.now();
                if (now - lastStreamFlush >= 300) {
                  lastStreamFlush = now;
                  state.streamingFiles = { [targetPath]: raw };
                }
              } else {
                assistant.text = /^\s*(?:```(?:json)?\s*)?\{/i.test(raw)
                  ? streamedMessage(raw)
                  : raw;
                readDraftChunk(data.chunk || "");
              }
            } else if (
              event === "TOOL_CALL_START" ||
              event === "TOOL_CALL_END"
            ) {
              const key = data.toolCallId ?? data.toolName;
              if (event === "TOOL_CALL_START")
                activeTools.set(key, data.toolName);
              else activeTools.delete(key);
              if (activeTools.size) {
                const latestTool = Array.from(activeTools.values()).at(-1);
                const label = toolActivityLabel(latestTool);
                assistant.activity = label;
                state.progress = label;
              } else {
                assistant.activity = "";
                state.progress = config.preset.ui.generating || "Generating…";
              }
            } else if (
              event !== "STATE_DELTA" &&
              event !== "DATA_MESSAGE" &&
              event !== "RUN_FINISHED" &&
              event !== "RUN_ERROR" &&
              typeof data?.message === "string" &&
              data.message.trim()
            ) {
              state.progress = data.message.trim();
            }
          },
          current.signal,
        );
        current.signal.throwIfAborted();
        assistant.text = result.message;
        assistant.streaming = false;
        if (result.draftIdentity) state.draftIdentity = result.draftIdentity;
        else if (result.draft?.id)
          state.draftIdentity = {
            id: result.draft.id,
            title: result.draft.title,
          };
        if (!result.draft) {
          assistant.files = [];
          return;
        }
        assistant.files = Object.entries(result.draft.files || {})
          .slice(0, 100)
          .map(([path, content]) => ({
            path,
            content,
            status: "Generated",
          }));
        assistant.fileStage = "generated";
        state.draft = result.draft;
        state.pending = result.draft;
        saveAttempt = {};
        if (session) state.session = { ...session };
      }
      if (
        state.pending &&
        config.publishing.enabled &&
        (!payload || config.publishing.automatic)
      )
        await saveMethod();
    } catch (cause) {
      if (!current.signal.aborted) errorMethod(cause);
    } finally {
      state.streamingFiles = null;
      if (assistant) assistant.streaming = false;
      if (controller === current) {
        state.busy = false;
        state.phase = "idle";
        state.progress = "";
        controller = null;
      }
    }
  };
  const sendMethod = (payload, session) => {
    if (!config.enabled) return false;
    if (state.busy || !payload.text?.trim() || (session && !session.canEdit))
      return false;
    if (state.pending && saveAttempt.requested) {
      state.error =
        "Check the previous publish result with Retry before starting another request.";
      return false;
    }
    try {
      buildChatPrompt(payload.text, config);
    } catch (cause) {
      state.error = cause.message;
      return false;
    }
    if (payload.attachments?.length) {
      state.error =
        "Attachments are not sent to the chat API yet. Remove them and include the details in your message.";
      return false;
    }
    // Start a new generation, retaining any already-created PR after a failed save.
    void runMethod(payload, session);
    return true;
  };
  const retryMethod = () => {
    if (!state.busy && state.pending) void runMethod();
  };
  const cancelMethod = () => {
    if (state.phase === "saving") return false;
    controller?.abort();
    if (assistant?.files?.length) assistant.fileStage = "stopped";
    if (state.busy)
      state.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Stopped. No new files were saved.",
      });
    return true;
  };
  return { state, sendMethod, retryMethod, cancelMethod };
}
