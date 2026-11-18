// Read completed file objects for display only. Publication still uses the final reply.
export function createChatDraftStream(onFile) {
  let text = "",
    offset = 0,
    stringStart = -1,
    escaped = false;
  let started = false,
    finished = false;
  const stack = [];
  let fileCount = 0;
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
      if (char === '"') stringStart = offset;
      else if (char === "{" || char === "[") {
        const path = parent ? [...parent.path, parent.key] : [];
        const isFile =
          char === "{" &&
          path.length === 3 &&
          path[0] === "draft" &&
          path[1] === "files" &&
          typeof path[2] === "string" &&
          fileCount < 100;
        stack.push({ path, start: offset, expectsKey: char === "{", isFile });
        if (isFile) {
          fileCount++;
          onFile({ path: path[2], status: "Generating" });
        }
      } else if (char === "}" || char === "]") {
        const node = stack.pop();
        if (node?.isFile) {
          try {
            onFile({
              path: node.path[2],
              status: "Generated",
              content: JSON.parse(text.slice(node.start, offset + 1)),
            });
          } catch {
            /* Incomplete or malformed files are never marked generated. */
          }
        }
        if (!stack.length) finished = true;
      } else if (char === "," && parent) parent.expectsKey = true;
    }
  };
}
