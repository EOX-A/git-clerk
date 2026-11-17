import { reactive } from "vue";
import { streamedMessage } from "./event-stream.js";
import { buildOscPrompt } from "./osc-request.js";
import { createChatDraftStream } from "./chat-draft-stream.js";

// State belongs to the conversation, so switching from New Session to a PR retains it.
export function createOscConversation({
  connect,
  generate,
  prepare,
  publish,
  onSaved,
  loadDraft = async () => null,
}) {
  const state = reactive({
    messages: [],
    busy: false,
    phase: "idle",
    progress: "",
    error: "",
    draft: null,
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
    state.error = cause.status
      ? "GitHub could not save the draft. Check your access and connection, then retry saving."
      : cause.message || "The request failed. Please retry.";
    state.messages.push({
      id: crypto.randomUUID(),
      role: "error",
      text: state.error,
    });
  };
  const saveMethod = async () => {
    state.phase = "preparing";
    state.progress = "Preparing files for Git…";
    const bundle = await prepare(state.pending, controller.signal);
    controller.signal.throwIfAborted();
    state.phase = "saving";
    if (assistant?.files?.length) assistant.fileStage = "publishing";
    const updating = Boolean(state.session);
    state.progress = state.session
      ? `Updating files in PR #${state.session.number} through the Git broker…`
      : "Publishing files and creating the PR through the Git broker…";
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
        number: state.session.number,
        title: state.session.title || bundle.draft.title,
        branch: state.session.branch,
        url: state.session.url,
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
          .map(({ role, text }) => ({
            role: role === "error" ? "assistant" : role,
            content: text,
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
        state.progress = "Generating OSC metadata…";
        raw = "";
        const readDraftChunk = createChatDraftStream((file) => {
          const index = assistant.files.findIndex(
            (item) => item.path === file.path,
          );
          if (index === -1) assistant.files.push(file);
          else assistant.files[index] = file;
        });
        const result = await generate(
          { prompt: payload.text.trim(), history, draft: state.draft },
          (event, data) => {
            if (current.signal.aborted) return;
            if (event === "TEXT_MESSAGE_CONTENT") {
              raw += data.chunk || "";
              if (raw.length > 2_000_000)
                throw new Error(
                  "The OSC response is too large. Request fewer files at a time.",
                );
              assistant.text = /^\s*(?:```(?:json)?\s*)?\{/i.test(raw)
                ? streamedMessage(raw)
                : raw;
              readDraftChunk(data.chunk || "");
            }
          },
          current.signal,
        );
        current.signal.throwIfAborted();
        assistant.text = result.message;
        assistant.streaming = false;
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
      if (state.pending) await saveMethod();
    } catch (cause) {
      if (!current.signal.aborted) errorMethod(cause);
    } finally {
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
    if (state.busy || !payload.text?.trim() || (session && !session.canEdit))
      return false;
    if (state.pending && saveAttempt.requested) {
      state.error =
        "Check the previous publish result with Retry before starting another request.";
      return false;
    }
    try {
      buildOscPrompt(payload.text);
    } catch (cause) {
      state.error = cause.message;
      return false;
    }
    if (payload.attachments?.length) {
      state.error =
        "Attachments are not sent to the OSC API yet. Remove them and include the details in your message.";
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
