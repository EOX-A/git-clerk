import GitClerkConfiguration from "http://localhost:8080/git-clerk-config.mjs";

// GitHub config
globalThis.ghConfig = {
  githubRepo: undefined,
  githubAuthToken: undefined,
};

function slugify(str) {
    str = str.replace(/^\s+|\s+$/g, ""); // trim leading/trailing white space
    str = str
        .replace(/[^a-z0-9 -]/g, "") // remove any non-alphanumeric characters
        .replace(/\s+/g, "_") // replace spaces with hyphens
        .replace(/_+/g, "_"); // remove consecutive hyphens
    return str;
}

const FILE_STRUCTURE = {
    type: "catalog",
    rootPath: "master",
    children: {
      atmosphere: {
        type: "catalog",
        title: "Atmosphere",
        children: {
          "<id>": {
            type: "collection",
            title: "Atmosphere Collection",
          },
        },
      },
      climate: {
        type: "catalog",
        title: "Climate",
        children: {
          "<id>": {
            type: "collection",
            title: "Climate Collection",
          },
        },
      },
      hydro: {
        type: "catalog",
        title: "Hydro",
        children: {
          "<id1>": {
            type: "collection",
            title: "Hydro Collection",
          },
          "<id2>": {
            type: "catalog",
            title: "Hydro Catalog",
            children: {
              "<id3>": {
                type: "collection",
                title: "Hydro Nested Collection",
              },
            },
          },
        },
      },
      ocean: {
        type: "catalog",
        title: "Ocean",
        children: {
          "<id1>": {
            type: "collection",
            title: "Ocean Collection",
          },
          "<id2>": {
            type: "catalog",
            title: "Ocean Catalog",
            children: {
              "<id3>": {
                type: "collection",
                title: "Ocean Nested Collection",
              },
            },
          },
        },
      },
    },
  };

const EDITOR_CONFIG = {
  temporalIntervala: {
    type: "array",
    format: "temporal-intervala",
    func: "TemporalIntervalEditor",
  },
}

const I18N = {
    locale: "en",
    fallbackLocale: "en",
    messages: {
      en: {
        buttonText: {
          automation: "Wizard",
        },
      },
    },
  }

  GitClerkConfiguration({
    fileStructure: FILE_STRUCTURE,
    defaultSchemaDetails: {
      catalog_schema: "https://gist.githubusercontent.com/srijitcoder/db8d2ce8a67666a9de46a5a63581f984/raw/42a1055af2a26bbbf69580cc285f514829769f1a/catalog.json",
      collection_schema: "https://gist.githubusercontent.com/srijitcoder/5ab881bd15d71acf956f939705437955/raw/9d410505701c98bd29cb84fd605fe1fbb482ebda/collection.json",
      preview: "/osc.html",
      content: {},
      jsonform: {
        propertiesToggle: true,
        options: {
          display_required_only: true,
          disable_properties: false,
        },
      },
    },
    editors: EDITOR_CONFIG,
    i18n: I18N,
    automationDetails: {
        linkHref: (parentPath, fileName) => `https://raw.githubusercontent.com/pangeo-data/pangeo-datastore-stac/master/${parentPath}/${fileName}`,
        initValue: (input) => ({
          id: slugify(input.title),
          title: input.title,
          created: new Date().toISOString().replace(/\.[0-9]{3}/, ""),
        }),
    },
    slugify: slugify
})