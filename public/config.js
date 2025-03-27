import "https://cdn.jsdelivr.net/npm/@json-editor/json-editor@latest/dist/jsoneditor.js";

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
    path: "/foo/bar/<id>.json",
    schema: {
      title: "FooBar editor",
      type: "object",
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
    preview: "/example-preview.html",
  },
];

// Define automations to perform multiple steps for the user
const automation = [
  {
    title: "Bootstrap File",
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
        id: {
          type: "string",
          minLength: 1,
          default: self.crypto.randomUUID(),
          options: {
            hidden: true,
          },
        },
        content: {
          type: "string",
          minLength: 1,
        },
      },
      required: ["id", "content"],
    },
    steps: [
      {
        type: "add",
        path: (input) => `/foo/${input.id}.json`,
        content: async (input) => {
          let content = input.content;
          let error = null;

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

          return error || content;
        },
      },
      {
        type: "navigate",
        path: (input) => `/foo/${input.id}.json`,
      },
    ],
  },
];

// Custom editor
// Example of how to build a custom editor can be found here:
// https://github.com/json-editor/json-editor/blob/master/docs/custom-editor.html
class MyEditor extends JSONEditor.AbstractEditor {
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

globalThis.gitClerkConfig = {
  ghConfig,
  basePath,
  schemaMap,
  automation,
  customEditorInterfaces,
  generateEnums
};
