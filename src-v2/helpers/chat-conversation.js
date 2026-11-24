import { reactive } from "vue";
import { streamedMessage } from "./event-stream.js";
import { buildChatPrompt } from "./chat-request.js";
import { createChatDraftStream } from "./chat-draft-stream.js";
import { createChatTextReveal } from "./chat-text-reveal.js";
import { chatOutputPath } from "./chat-output.js";
import { getChatConfig } from "./chat-config.js";

function updateFile(files, file) {
  const index = files.findIndex((item) => item.path === file.path);
  if (index === -1) files.push(file);
  else files[index] = file;
}

// State belongs to the conversation, so switching from New Session to a PR retains it.
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
    draft: null,
    draftIdentity: null,
    pending: null,
    session: null,
    completed: 0,
    previewFiles: [],
    savedFiles: [],
    publication: null,
  });
  let controller;
  let saveAttempt = {};
  let assistant;

  const errorMethod = (cause) => {
    if (assistant) assistant.fileStage = "failed";
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
      throw new Error("Saving drafts from chat is disabled for this instance.");
    if (state.session && !config.publishing.updateExistingSession)
      throw new Error(
        "Chat updates to existing sessions are disabled for this instance.",
      );
    state.phase = "preparing";
    state.progress = "Preparing files…";
    const bundle = await prepare(state.pending, controller.signal);
    controller.signal.throwIfAborted();
    state.phase = "saving";
    if (assistant) assistant.fileStage = "publishing";
    const updating = Boolean(state.session);
    state.progress = state.session
      ? `Updating files in PR #${state.session.number}…`
      : "Creating your draft…";
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
      previewInWorkspace: assistant?.previewInWorkspace,
      files: result.files.map((file) =>
        assistant?.previewInWorkspace
          ? { path: file.path, status: "Saved" }
          : {
              ...file,
              status: "Saved",
              content: bundle.staged_files[file.path],
            },
      ),
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
    let reveal;
    controller = current;
    state.busy = true;
    state.error = "";
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
          previewInWorkspace: !session,
          files: [],
          fileStage: "generating",
        });
        state.messages.push(assistant);
        state.phase = "generating";
        state.progress = config.preset.ui.generating;
        let raw = "";
        const preview = !session;
        state.previewFiles = [];
        const outputFile = config.preset.outputFile;
        const previewPath = () =>
          chatOutputPath(outputFile, state.draft, state.draftIdentity?.id) ||
          outputFile.replace(/^\//, "");
        if (preview && outputFile) {
          const path = previewPath();
          state.previewFiles.push({ path, content: "" });
          assistant.files.push({ path, status: "Generating" });
        }
        const streamsMarkdown =
          config.preset.outputFile &&
          config.preset.output_format === "markdown";
        if (!preview && streamsMarkdown && config.backend.stream)
          reveal = createChatTextReveal(assistant);
        const activeTools = new Set();
        const readDraftChunk = createChatDraftStream(
          (file) => {
            if (preview) updateFile(state.previewFiles, file);
            updateFile(
              assistant.files,
              preview ? { path: file.path, status: file.status } : file,
            );
          },
          preview ? (file) => updateFile(state.previewFiles, file) : null,
        );
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
              if (preview && outputFile && state.previewFiles.length) {
                const path = previewPath();
                state.previewFiles[0].path = path;
                assistant.files[0].path = path;
              }
            },
          },
          (event, data) => {
            if (current.signal.aborted) return;
            if (event === "TEXT_MESSAGE_CONTENT") {
              raw += data.chunk || "";
              if (raw.length > 2_000_000)
                throw new Error(
                  "The response is too large. Request fewer files at a time.",
                );
              if (preview) {
                if (outputFile) state.previewFiles[0].content = raw;
                else readDraftChunk(data.chunk || "");
              } else if (streamsMarkdown) {
                if (reveal) reveal.update(raw);
                else assistant.text = raw;
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
              if (event === "TOOL_CALL_START") activeTools.add(key);
              else activeTools.delete(key);
              assistant.activity = activeTools.size ? "Using tools…" : "";
            }
          },
          current.signal,
        );
        current.signal.throwIfAborted();
        if (result.markdown && reveal) {
          reveal.update(result.markdown);
        } else {
          reveal?.finish();
          assistant.text = preview
            ? result.message
            : (result.markdown ?? result.message);
        }
        if (result.markdown) assistant.historyText = result.message;
        assistant.streaming = false;
        if (result.draftIdentity) state.draftIdentity = result.draftIdentity;
        else if (result.draft?.id)
          state.draftIdentity = {
            id: result.draft.id,
            title: result.draft.title,
          };
        if (!result.draft) {
          assistant.files = [];
          state.previewFiles = [];
          return;
        }
        const generatedFiles = Object.entries(result.draft.files || {})
          .slice(0, 100)
          .map(([path, content]) => ({
            path,
            content,
            status: "Generated",
          }));
        if (preview) state.previewFiles = generatedFiles;
        assistant.files = preview
          ? generatedFiles.map(({ path, status }) => ({ path, status }))
          : generatedFiles;
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
      if (!state.pending) state.previewFiles = [];
      if (!current.signal.aborted) errorMethod(cause);
    } finally {
      if (current.signal.aborted) reveal?.finish();
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
        "Retry saving the draft before starting another request.";
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
    if (state.busy && assistant?.files?.length) assistant.fileStage = "stopped";
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
