export function stringifyIfNeeded(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "object") {
    return JSON.stringify(value, "", 2);
  }

  return value;
}

export function parseIfNeeded(value) {
  if (value == null) return null;

  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
