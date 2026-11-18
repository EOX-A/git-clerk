/**
 * Example config file showing all functionalities of git-clerk v2
 * It includes all configuration options, plus some helper functions
 *
 * Please refer to README.md for documentation of available configuration options
 */

// Importing JSONEditor.AbstractEditor for Custom editor "MyEditor" (see below)
import { AbstractEditor } from "https://cdn.jsdelivr.net/npm/@json-editor/json-editor@latest/src/editor.js/+esm";

// GitHub config
const ghConfig = {
  githubRepo: undefined,
  githubAuthToken: undefined,
};

// Base path at which the apps runs
const basePath = "/";

// Define JSON schemas for specific file paths
const schemaMap = [
  {
    path: "/stories/<id>.md",
    output: "Story",
    schema: {
      title: "Narrative editor",
      type: "object",
      properties: {
        Story: {
          title: "Narrative",
          type: "string",
          format: "textarea",
          description:
            "Write Markdown headings, paragraphs, lists, links and images.",
        },
      },
    },
    content: { Story: "# Untitled narrative\n\nStart writing here.\n" },
    jsonform: {
      options: { disable_edit_json: true, disable_properties: true },
    },
    preview: "/narrative-preview.html",
  },
  {
    path: "/foo/bar/<id>.json",
    schema: {
      title: "FooBar editor",
      type: "object",
      required: ["foo"],
      properties: {
        id: {
          type: "string",
          options: {
            hidden: true,
          },
        },
        foo: {
          title: "Foo",
          type: "string",
          description: "Simple string input",
          minLength: 1,
          options: {
            inputAttributes: {
              placeholder: "Type something...",
            },
          },
        },
        bar: {
          title: "Bar",
          description: "Boolean input rendered as checkbox",
          type: "boolean",
          format: "checkbox",
        },
        custom: {
          title: "Custom",
          description: "Custom editor example",
          type: "string",
          format: "custom-input",
        },
        dynamicEnum: {
          title: "Dynamic Enum",
          description:
            "Dynamically loads files from the current branch for selection",
          type: "array",
          format: "select",
          items: {
            type: "string",
            enum: [],
          },
        },
      },
    },
    content: {
      foo: "Initial content for file creation",
    },
    jsonform: {
      options: {
        disable_edit_json: false,
        disable_properties: false,
        show_opt_in: true,
      },
    },
    preview: "/example-preview.html",
  },
  // OSC example editor mappings; chat publishing does not validate against these.
  ...Object.entries({
    products: "collection.json",
    projects: "collection.json",
    variables: "catalog.json",
    themes: "catalog.json",
    "eo-missions": "catalog.json",
  }).flatMap(([category, filename]) => [
    {
      path: `/${category}/catalog.json`,
      url: `https://esa-earthcode.github.io/open-science-catalog-validation/schemas/${category}/parent.json`,
    },
    {
      path: `/${category}/<id>/${filename}`,
      url: `https://esa-earthcode.github.io/open-science-catalog-validation/schemas/${category}/children.json`,
    },
  ]),
];

// Define automations to perform multiple steps for the user
const automation = [
  {
    title: "Initialise Bootstrap File",
    description:
      "Bootstrap a new file with a pre-defined folder structure and ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          default: self.crypto.randomUUID(),
          options: {
            hidden: true,
          },
        },
        title: {
          type: "string",
          minLength: 1,
        },
      },
      required: ["id", "title"],
    },
    steps: [
      {
        type: "add",
        path: (input) => `/foo/bar/${input.id}.json`,
        content: (input) => ({
          id: input.id,
          foo: input.title,
          bar: false,
          custom: "",
        }),
      },
      {
        type: "navigate",
        path: (input) => `/foo/bar/${input.id}.json`,
      },
    ],
  },
  {
    id: "add-file",
    title: "Add new outside automation file",
    description: "Add a new file to the current branch",
    hidden: true,
    inputSchema: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          minLength: 1,
        },
        content: {
          type: "string",
          minLength: 1,
        },
      },
      required: ["fileName"],
    },
    steps: [
      {
        type: "add",
        path: (input) => `/foo/${input.fileName}`,
        content: async (input) => {
          let content = input.content;
          let error = null;

          function decoderBase64ToUtf8(str) {
            return decodeURIComponent(escape(atob(str)));
          }

          function isBase64(str) {
            // Regular expression to match base64 pattern
            const base64Regex =
              /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

            try {
              if (!base64Regex.test(str)) return false;

              const decoded = atob(str);
              const encoded = btoa(decoded);

              return encoded === str;
            } catch (err) {
              return false;
            }
          }

          function isUrl(str) {
            try {
              new URL(str);
              return true;
            } catch {
              return false;
            }
          }

          if (content) {
            try {
              if (isUrl(content)) {
                const response = await fetch(content);
                if (!response.ok) {
                  throw new Error("Failed to fetch content from URL");
                }
                content = await response.json();
              } else if (isBase64(content)) {
                content = decoderBase64ToUtf8(content);
              } else {
                content = decodeURIComponent(content);
              }
            } catch (e) {
              error = e;
            }
          }

          return error || content;
        },
      },
      {
        type: "navigate",
        path: (input) => `/foo/${input.fileName}`,
      },
    ],
  },
];

// Custom editor
// Example of how to build a custom editor can be found here:
// https://github.com/json-editor/json-editor/blob/master/docs/custom-editor.html
class MyEditor extends AbstractEditor {
  register() {
    super.register();
  }

  unregister() {
    super.unregister();
  }

  build() {
    this.input = document.createElement("input");
    this.input.style.background = "lightblue";
    this.input.placeholder = "I'm a custom input!";
    this.input.id = this.formname;

    const description = this.schema.description;
    if (description)
      this.description = this.theme.getFormInputDescription(
        this.translateProperty(description),
      );

    this.control = this.theme.getFormControl(
      this.label,
      this.input,
      this.description,
      this.infoButton,
    );
    this.container.appendChild(this.control);
  }

  destroy() {
    super.destroy();
  }
}

// Custom editor is used for fields with the format "custom-input"
const customEditorInterfaces = {
  "custom-input": {
    type: "string",
    format: "custom-input",
    func: MyEditor,
  },
};

// Get file details of file in the same branch and use details of it
// to populate an enum field
const generateEnums = async (
  schemaMetaDetails,
  session,
  cache,
  { getFileDetails },
) => {
  if (schemaMetaDetails.path?.includes("/foo/bar/")) {
    const readme = await getFileDetails(session, "/README.md", cache);
    schemaMetaDetails.schema.properties.dynamicEnum.items.enum = [readme.path];
  }
  return schemaMetaDetails;
};

const deployedPreviewLink = (sessionDetail) => {
  const { number, base } = sessionDetail;
  return `https://github.com/${base.repo.owner.login}/${base.repo.name}/pull/${number}`;
};

const disableManualFileCreation = false;

const i18n = {
  messages: {
    en: {
      buttonText: {
        automation: "Wizard",
      },
    },
    de: {
      buttonText: {
        automation: "Zauberer",
      },
    },
  },
};

const forkingLocation = {
  personal: true,
  org: true,
};

const allowedOrigins = [import.meta.url.replace("/config-v2.js", "")];

globalThis.gitClerkConfig = {
  // V2 only. Use the workspace gateway URL in a hosted deployment.
  gitBrokerUrl: "http://localhost:8015",
  // gitBroker: { provider: "github", repo: "owner/repository" },
  ghConfig,
  basePath,
  schemaMap,
  automation,
  customEditorInterfaces,
  generateEnums,
  deployedPreviewLink,
  disableManualFileCreation,
  i18n,
  allowedOrigins,
  forkingLocation,
};

// V2 chat: one active preset per Git Clerk instance. Streaming defaults to true.
// globalThis.gitClerkConfig.chat = {
//   enabled: true,
//   backend: {
//     baseUrl: "http://localhost:8000",
//   },
//   preset: {
//     projectId: "earthcode-osc",
//     profile: "chat",
//     output_format: "text_and_a2ui",
//     promptInstructions: "Complete linked STAC/OSC JSON files",
//     prBody:
//       "OSC metadata generated in Git Clerk. Schema validation has not been performed.",
//     fileExample: { "relative/path.json": {} },
//     context: { extensions: [".json"] },
//     ui: {
//       assistantName: "Git Clerk",
//       panelTitle: "Git Clerk AI Assistant",
//       heading: "What would you like to update?",
//       description: "Create and edit EarthCODE catalogue content.",
//       placeholder: "Describe a product, project or metadata change…",
//       followUpPlaceholder: "Describe the next catalogue change…",
//       sessionTitle: "New catalogue session",
//       welcome: "What would you like to edit or add to this catalogue?",
//       generating: "Preparing catalogue changes…",
//       footer:
//         "Catalogue files are published as a PR in the configured repository. Chat stays in this app session.",
//       suggestions: [
//         "Create a synthetic sample product",
//         "Update a project description",
//       ],
//     },
//   },
//   features: {
//     attachments: false,
//     modelSelector: false,
//     manualSessionCreation: true,
//   },
//   publishing: {
//     enabled: true,
//     automatic: true,
//     updateExistingSession: true,
//   },
// };

// Alternative narrative editor config. Comment out the OSC assignment above and
// uncomment this block to activate it. Use only one chat configuration at a time.
// Use <id> to put the backend draft ID in the output file path.
// /* NARRATIVE_CHAT_CONFIG
globalThis.gitClerkConfig.chat = {
  enabled: true,
  backend: { baseUrl: "http://localhost:8000" },
  preset: {
    projectId: "generic-eox",
    profile: "markdown_editor",
    output_format: "markdown",
    outputFile: "stories/<id>.md",
    promptInstructions:
      "Create or edit the complete Markdown narrative. Preserve existing content unless asked to change it. Return only Markdown",
    prBody: "Narrative content generated in Git Clerk.",
    prTitle: "Publish: <title> (<username>)",
    context: { extensions: [".md"], inputField: "markdownSection" },
    ui: {
      assistantName: "Git Clerk",
      panelTitle: "Narrative editor",
      heading: "What story would you like to tell?",
      description:
        "Create and refine a narrative with a live Markdown preview.",
      placeholder: "Describe the narrative you want to write…",
      followUpPlaceholder: "How would you like to revise this narrative?",
      sessionTitle: "New narrative session",
      welcome: "What would you like to write or improve in this narrative?",
      generating: "Writing your narrative…",
      footer:
        "Narratives are saved in the stories folder in a PR. Chat stays in this app session.",
      suggestions: [
        "Write a synthetic ocean observation story",
        "Draft an introduction about urban heat",
      ],
    },
  },
  features: {
    attachments: false,
    modelSelector: false,
    manualSessionCreation: true,
  },
  publishing: {
    enabled: true,
    automatic: true,
    updateExistingSession: true,
  },
};
// NARRATIVE_CHAT_CONFIG */
