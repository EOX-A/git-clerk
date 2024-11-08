// config.js
globalThis.ghConfig = {
  githubOwner: "",
  githubRepo: "",
  githubAuthToken: async () => {
    async function getGithubAuthToken() {
      // Fetch GitHub Token through API or through event listeners or through other functions
      return ""; // return the token here
    }

    return await getGithubAuthToken();
  },
};

globalThis.schemaMap = [
  {
    path: "/eo-missions/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/eo-missions/parent.json",
  },
  {
    path: "/eo-missions/<id>/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/eo-missions/children.json",
  },
  {
    path: "/products/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/products/parent.json",
  },
  {
    path: "/products/<id>/collection.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/products/children.json",
  },
  {
    path: "/projects/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/projects/parent.json",
  },
  {
    path: "/projects/<id>/collection.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/projects/children.json",
  },
  {
    path: "/themes/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/themes/parent.json",
  },
  {
    path: "/themes/<id>/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/themes/children.json",
  },
  {
    path: "/variables/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/variables/parent.json",
  },
  {
    path: "/variables/<id>/catalog.json",
    url: "https://esa-earthcode.github.io/open-science-catalog-validation/schemas/variables/children.json",
  },
  {
    path: "/storytelling/<id>.json",
    schema: {
      title: "git-clerk",
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "textarea",
        },
      },
    },
  },
]