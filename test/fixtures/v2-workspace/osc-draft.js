export default {
  title: "Sample OSC sea temperature",
  files: {
    "products/sample/collection.json": {
      type: "Collection",
      id: "sample",
      title: "Sample sea temperature",
      description: "Synthetic ocean temperature product for testing.",
      links: [{ rel: "parent", href: "../catalog.json" }],
    },
    "products/catalog.json": {
      type: "Catalog",
      id: "products",
      links: [{ rel: "child", href: "./sample/collection.json" }],
    },
    "projects/sample/collection.json": {
      type: "Collection",
      id: "sample",
      title: "Sample climate project",
      links: [{ rel: "child", href: "../../products/sample/collection.json" }],
    },
    "projects/catalog.json": {
      type: "Catalog",
      id: "projects",
      links: [{ rel: "child", href: "./sample/collection.json" }],
    },
    "variables/sea-surface-temperature/catalog.json": {
      type: "Catalog",
      id: "sea-surface-temperature",
      links: [{ rel: "child", href: "../../products/sample/collection.json" }],
    },
    "variables/catalog.json": {
      type: "Catalog",
      id: "variables",
      links: [{ rel: "child", href: "./sea-surface-temperature/catalog.json" }],
    },
  },
};
