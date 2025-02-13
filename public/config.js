import "https://cdn.jsdelivr.net/npm/@json-editor/json-editor@latest/dist/jsoneditor.js";

// GitHub config
globalThis.ghConfig = {
  githubRepo: "",
  githubAuthToken: () => new Promise((resolve) => resolve("")),
};

// Base path at which the apps runs
globalThis.basePath = "/";

// Define JSON schemas for specific file paths
globalThis.schemaMap = [
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
    preview: "example-preview.html",
  },
];

// Define automations to perform multiple steps for the user
globalThis.automation = [
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
globalThis.customEditorInterfaces = {
  "custom-input": {
    type: "string",
    format: "custom-input",
    func: MyEditor,
  },
};

// Get file details of file in the same branch and use details of it
// to populate an enum field
globalThis.generateEnums = async (
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
