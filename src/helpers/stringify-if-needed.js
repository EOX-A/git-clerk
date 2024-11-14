export default function stringifyIfNeeded(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "object") {
    return JSON.stringify(value, "", 2);
  }

  return value;
}
