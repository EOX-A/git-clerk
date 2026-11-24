// Preview only. The final backend reply supplies the files for publication.
export function createChatDraftStream(onFile, onPartial) {
  let text = "",
    offset = 0,
    stringStart = -1,
    escaped = false;
  let started = false,
    finished = false,
    fileCount = 0;
  let file;
  const stack = [];

  const finishFile = (end) => {
    try {
      const content = JSON.parse(text.slice(file.start, end));
      onFile({ path: file.path, status: "Generated", content });
    } catch {
      // A malformed value cannot become a completed preview.
    }
    file = null;
  };

  return (chunk) => {
    text += chunk;
    for (; offset < text.length && !finished; offset++) {
      const char = text[offset];
      const parent = stack.at(-1);
      if (stringStart !== -1) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') {
          if (parent?.expectsKey) {
            try {
              parent.key = JSON.parse(text.slice(stringStart, offset + 1));
            } catch {
              finished = true;
            }
            parent.expectsKey = false;
          }
          if (file?.start === stringStart) finishFile(offset + 1);
          stringStart = -1;
        }
        continue;
      }
      if (!started) {
        if (char !== "{") continue;
        if (!/^\s*(?:```(?:json)?\s*)?$/i.test(text.slice(0, offset))) {
          finished = true;
          continue;
        }
        started = true;
      }
      if (parent?.isFiles) {
        if (file && (char === "," || char === "}")) finishFile(offset);
        if (parent.awaitingValue && !/\s/.test(char)) {
          parent.awaitingValue = false;
          if (fileCount++ < 100) {
            file = { path: parent.key, start: offset };
            onFile({ path: file.path, status: "Generating" });
          }
        }
        if (char === ":") parent.awaitingValue = true;
      }
      if (char === '"') stringStart = offset;
      else if (char === "{" || char === "[") {
        const path = parent ? [...parent.path, parent.key] : [];
        stack.push({
          path,
          expectsKey: char === "{",
          isFiles:
            char === "{" &&
            path.length === 2 &&
            path[0] === "draft" &&
            path[1] === "files",
        });
      } else if (char === "}" || char === "]") {
        stack.pop();
        if (file && stack.at(-1)?.isFiles) finishFile(offset + 1);
        if (!stack.length) finished = true;
      } else if (char === "," && parent) parent.expectsKey = true;
    }
    if (file && onPartial)
      onPartial({
        path: file.path,
        status: "Generating",
        source: text.slice(file.start, offset),
      });
  };
}
