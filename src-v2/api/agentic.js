import {
  buildChatPrompt,
  buildChatHistory,
  parseChatReply,
} from "../helpers/chat-request.js";
import { readEventStream, checkChatResponse } from "../helpers/event-stream.js";
import { getChatConfig } from "../helpers/chat-config.js";
import { chatOutputPath } from "../helpers/chat-output.js";

// Console-only chat smoke test. Provider credentials stay on the backend.
export async function generateChatTest(prompt, signal) {
  const config = getChatConfig();
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
  { prompt, history, draft, draftIdentity, model, branch },
  onEvent,
  signal,
) {
  const config = getChatConfig();
  if (!config.enabled) throw new Error(config.preset.ui.disabledMessage);
  const baseURL = config.backend.baseUrl;
  const requestPrompt = buildChatPrompt(prompt, config);
  const identity = draftIdentity || draft;
  const outputPath = chatOutputPath(
    config.preset.outputFile,
    draft,
    identity?.id,
  );
  const currentContent = outputPath ? draft?.files?.[outputPath] : undefined;
  const response = await fetch(`${baseURL}/api/generate`, {
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
      ...(identity?.id ? { id: identity.id, title: identity.title } : {}),
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
  let result;
  let finished = false;
  if (!config.backend.stream) {
    await checkChatResponse(response);
    result = parseChatReply(await response.json(), config, outputPath);
    finished = true;
  } else
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
        if (event === "STATE_DELTA")
          result = parseChatReply(data, config, outputPath);
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
  if (
    !finished ||
    !result ||
    typeof result.message !== "string" ||
    !("draft" in result)
  )
    throw new Error(
      "The response did not include a complete draft or reply. No files were saved. Ask for complete files and retry.",
    );
  return result;
}
