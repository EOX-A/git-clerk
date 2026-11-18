// Consume SSE incrementally; network chunks need not end at frame/UTF-8 boundaries.
export async function checkChatResponse(response) {
  if (!response.ok) {
    let detail = "";
    if ([400, 422, 429].includes(response.status)) {
      try {
        const body = await response.json();
        if (typeof body.detail === "string")
          detail = body.detail.slice(0, 1500);
        else if (Array.isArray(body.detail))
          detail = body.detail
            .map((item) => item.msg)
            .filter(Boolean)
            .join(" ")
            .slice(0, 1500);
      } catch {
        /* Non-JSON error responses retain the HTTP status. */
      }
    }
    throw new Error(
      `Chat request failed (HTTP ${response.status}).${detail ? ` ${detail}` : ""}`,
    );
  }
}

export async function readEventStream(response, onEvent, signal) {
  await checkChatResponse(response);
  if (
    !response.headers.get("content-type")?.includes("text/event-stream") ||
    !response.body
  )
    throw new Error(
      "The backend did not return a chat stream. Check the API URL and server response.",
    );
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const emit = (frame) => {
    let event = "message";
    const data = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length) onEvent(event, JSON.parse(data.join("\n")));
  };
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      // A CR may arrive separately from the following LF.
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        emit(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
      if (buffer.length > 2_000_000)
        throw new Error("Chat stream exceeded the supported size.");
      if (done) break;
    }
    if (buffer.trim())
      throw new Error("The chat stream ended before its final event.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// Only the conversational message is shown while the JSON draft is streaming.
export function streamedMessage(text) {
  const match = /^\s*(?:```(?:json)?\s*)?\{\s*"message"\s*:\s*"/i.exec(text);
  if (!match) return "";
  const value = text.slice(match[0].length);
  let result = "";
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"') break;
    if (value[i] !== "\\") {
      result += value[i];
      continue;
    }
    const escape = value[++i];
    if (!escape) break;
    if (escape === "u") {
      const hex = value.slice(i + 1, i + 5);
      if (!/^[a-f\d]{4}$/i.test(hex)) break;
      result += String.fromCharCode(parseInt(hex, 16));
      i += 4;
    } else {
      result +=
        {
          n: "\n",
          r: "\r",
          t: "\t",
          b: "\b",
          f: "\f",
          '"': '"',
          "\\": "\\",
          "/": "/",
        }[escape] ?? "";
    }
  }
  return result;
}
