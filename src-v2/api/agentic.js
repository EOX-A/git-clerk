import {
  buildChatPrompt,
  buildChatHistory,
  parseChatReply,
} from "../helpers/chat-request.js";
import { readEventStream, checkChatResponse } from "../helpers/event-stream.js";
import { getChatConfig } from "../helpers/chat-config.js";
import { chatDraftIdentity, chatOutputPath } from "../helpers/chat-output.js";

async function requestChatText(prompt, config, signal) {
  const baseURL = config.backend.baseUrl;
  const response = await fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      prompt,
      profile: "chat",
      output_format: "text",
      project_id: config.preset.projectId,
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

// Console-only chat smoke test. Provider credentials stay on the backend.
export function generateChatTest(prompt, signal) {
  return requestChatText(prompt, getChatConfig(), signal);
}

async function generateSessionTitle(prompt, config, signal) {
  try {
    // Leave room for the instructions within the backend's 400-character limit.
    const request = Array.from(prompt.trim()).slice(0, 290).join("");
    const response = await requestChatText(
      `Return only a 4 to 6 word title for the request below. Do not use tools.\n\n${request}`,
      config,
      signal,
    );
    const title = response.message ?? response.text;
    if (
      typeof title === "string" &&
      !/^\s*\[(Error|Exception|Output blocked):/.test(title)
    )
      return chatDraftIdentity(title);
  } catch {
    // A title request is optional. The final draft or first prompt supplies a title.
  }
}

// Inspect the configured profile's raw response without publishing files.
export async function generatePresetTest(prompt, signal) {
  const config = getChatConfig();
  const baseURL = config.backend.baseUrl;
  const response = await fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      prompt,
      profile: config.preset.profile,
      output_format: config.preset.output_format,
      project_id: config.preset.projectId,
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Preset request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

// Keep prompt text within the existing backend limit; the chat profile reads history.
export async function streamChat(
  {
    prompt,
    history,
    draft,
    draftIdentity,
    model,
    branch,
    sessionTitle,
    onTitle,
  },
  onEvent,
  signal,
) {
  const config = getChatConfig();
  if (!config.enabled) throw new Error(config.preset.ui.disabledMessage);
  const baseURL = config.backend.baseUrl;
  const requestPrompt = buildChatPrompt(prompt, config);
  const identity =
    draftIdentity || (draft?.id ? { id: draft.id, title: draft.title } : null);
  const outputPath = chatOutputPath(
    config.preset.outputFile,
    draft,
    identity?.id,
  );
  const currentContent = outputPath ? draft?.files?.[outputPath] : undefined;
  const generation = fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: config.backend.stream ? "text/event-stream" : "application/json",
      ...(branch ? { "X-Git-Session-Branch": branch } : {}),
    },
    credentials: "same-origin",
    signal,
    body: JSON.stringify({
      prompt: requestPrompt,
      history: buildChatHistory(history, draft),
      profile: config.preset.profile,
      output_format: config.preset.output_format,
      project_id: config.preset.projectId,
      stream: config.backend.stream,
      ...(model ? { model } : {}),
      ...(outputPath &&
      config.preset.context.inputField &&
      currentContent !== undefined
        ? {
            [config.preset.context.inputField]:
              typeof currentContent === "string" ? currentContent : "",
          }
        : {}),
    }),
  });
  const namingController = new AbortController();
  let titleIdentity;
  if (!branch && !sessionTitle && !draft && !identity) {
    const titleSignal = AbortSignal.any([
      namingController.signal,
      AbortSignal.timeout(8_000),
      ...(signal ? [signal] : []),
    ]);
    titleIdentity = generateSessionTitle(prompt, config, titleSignal).then(
      (generated) => {
        if (!generated || titleSignal.aborted) return null;
        onTitle?.(generated);
        return generated;
      },
    );
  }
  try {
    const payload = await readChatResult(
      await generation,
      config.backend.stream,
      onEvent,
      signal,
    );
    const generatedIdentity = payload && (await titleIdentity);
    signal?.throwIfAborted();
    const result = parseChatReply(payload, config, {
      outputPath,
      identity: identity ?? generatedIdentity,
      sessionTitle: sessionTitle || draft?.title,
      prompt,
    });
    if (!result || typeof result.message !== "string" || !("draft" in result))
      throw new Error(
        "The response did not include a complete draft or reply. No files were saved. Ask for complete files and retry.",
      );
    return result;
  } finally {
    namingController.abort();
  }
}

async function readChatResult(response, stream, onEvent, signal) {
  if (!stream) {
    await checkChatResponse(response);
    return response.json();
  }
  let payload;
  let finished = false;
  await readEventStream(
    response,
    (event, data) => {
      if (
        event === "RUN_ERROR" ||
        (event === "TEXT_MESSAGE_CONTENT" &&
          /^\s*\[(Error|Exception|Output blocked):/.test(data.chunk || ""))
      )
        throw new Error(
          "Chat generation failed. Check the backend logs or retry your request.",
        );
      if (event === "STATE_DELTA") payload = data;
      if (event === "RUN_FINISHED") {
        if (data.status !== "success")
          throw new Error(
            "Generation could not complete. Try rephrasing your request.",
          );
        finished = true;
      }
      onEvent(event, data);
    },
    signal,
  );
  return finished ? payload : null;
}
