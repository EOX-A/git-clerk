export function stringifyIfNeeded(value, oldContent) {
  if (value === null) {
    return null;
  }

  if (typeof value === "object") {
    if (oldContent) {
      const oldOrder = JSON.parse(oldContent);
      const getOrderedKeys = (obj, oldObj) => {
        const oldKeys = Object.keys(oldObj || {});
        const newKeys = Object.keys(obj || {});
        return [...new Set([...oldKeys, ...newKeys])];
      };

      const orderObject = (obj, oldObj) => {
        if (!obj || typeof obj !== "object") return obj;

        const ordered = Array.isArray(obj) ? [] : {};
        getOrderedKeys(obj, oldObj).forEach((key) => {
          if (key in obj) {
            ordered[key] =
              typeof obj[key] === "object" && obj[key] !== null
                ? orderObject(obj[key], oldObj?.[key])
                : obj[key];
          }
        });
        return ordered;
      };

      const orderedValue = orderObject(value, oldOrder);
      return JSON.stringify(orderedValue, null, 2) + "\n";
    } else {
      return JSON.stringify(value, null, 2) + "\n";
    }
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
