import {
  buildOscPrompt,
  buildOscHistory,
  parseOscReply,
} from "../helpers/osc-request.js";
import { readEventStream } from "../helpers/event-stream.js";

// Console-only chat smoke test. Provider credentials stay on the backend.
export async function generateChatTest(prompt, signal) {
  const baseURL = (
    import.meta.env?.GITCLERK_AGENTIC_API_URL || "http://localhost:8000"
  ).replace(/\/+$/, "");
  const response = await fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      prompt,
      profile: "chat",
      output_format: "text",
      project_id: "generic-eox",
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

// Generate an OSC JSON draft for console inspection; this does not publish files.
export async function generateOscTest(prompt, signal) {
  const baseURL = (
    import.meta.env?.GITCLERK_AGENTIC_API_URL || "http://localhost:8000"
  ).replace(/\/+$/, "");
  const response = await fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      prompt,
      profile: "chat",
      output_format: "json",
      project_id: "earthcode-osc",
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`OSC request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

// Keep prompt text within the existing backend limit; the chat profile reads history.
export async function streamOscChat(
  { prompt, history, draft },
  onEvent,
  signal,
) {
  const baseURL = (
    import.meta.env?.GITCLERK_AGENTIC_API_URL || "http://localhost:8000"
  ).replace(/\/+$/, "");
  const requestPrompt = buildOscPrompt(prompt);
  const response = await fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    signal,
    body: JSON.stringify({
      prompt: requestPrompt,
      history: buildOscHistory(history, draft),
      profile: "chat",
      // JSON output selects a profile which ignores conversation history in this backend.
      output_format: "text_and_a2ui",
      project_id: "earthcode-osc",
      stream: true,
    }),
  });
  let result;
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
          "OSC generation failed. Check the backend logs or retry your request.",
        );
      if (event === "STATE_DELTA") result = parseOscReply(data);
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
      "The OSC response did not include a complete draft or reply. No files were saved. Ask for complete OSC files and retry.",
    );
  return result;
}
