const SCHEMA_BASE =
  "https://esa-earthcode.github.io/open-science-catalog-validation/schemas";
const CHILD_FILES = {
  products: "collection.json",
  projects: "collection.json",
  variables: "catalog.json",
  themes: "catalog.json",
  "eo-missions": "catalog.json",
};

// V2's OSC workflow works with the generic config; configured schemas take priority.
export default function oscSchema(path) {
  const parts = path.replace(/^\//, "").split("/");
  const [category, id, file] = parts;
  if (!Object.hasOwn(CHILD_FILES, category)) return null;
  const parent = parts.length === 2 && id === "catalog.json";
  const child =
    parts.length === 3 &&
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,119}$/.test(id) &&
    file === CHILD_FILES[category];
  if (!parent && !child) return null;
  return {
    path: parent
      ? `/${category}/catalog.json`
      : `/${category}/<id>/${CHILD_FILES[category]}`,
    url: `${SCHEMA_BASE}/${category}/${parent ? "parent" : "children"}.json`,
  };
}
