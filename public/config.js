// config.js
import "https://cdn.jsdelivr.net/npm/@json-editor/json-editor@latest/dist/jsoneditor.js";

globalThis.ghConfig = {
  githubRepo: "",
  githubAuthToken: () => new Promise((resolve) => resolve("")),
};

const PATH_TO_UPLOAD = "assets";

function decoderBase64ToUtf8(str) {
  return decodeURIComponent(escape(atob(str)));
}

const handleLoaderPostMessage = (enable = true) => {
  window.parent.postMessage(
    {
      type: enable ? "ENABLE_LOADER_POSTMESSAGE" : "DISABLE_LOADER_POSTMESSAGE",
    },
    "*",
  );
};

// Shared upload functionality
const handleFileUpload = async (file, editor, fileType, insertTemplate) => {
  // Check if file is correct type
  if (!file.type.startsWith(fileType + "/")) {
    alert(`Please select a ${fileType} file`);
    return;
  }

  // Check file size (10MB = 10 * 1024 * 1024 bytes)
  if (file.size > 10 * 1024 * 1024) {
    alert("File size must be less than 10MB");
    return;
  }

  // Create a FormData object to hold the file data
  const formData = new FormData();
  formData.append("file", file);

  handleLoaderPostMessage(true);

  // Convert file to base64
  const reader = new FileReader();
  const base64Promise = new Promise((resolve) => {
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
  });
  reader.readAsDataURL(file);
  const base64Content = await base64Promise;

  try {
    // Get PR number from URL path
    const pathParts = window.location.pathname.split("/");
    const prNumber = pathParts[1]; // Get PR number like "62"

    // Get session details to get branch info
    const token = await globalThis.ghConfig.config.auth;
    const owner = globalThis.ghConfig.config.username;
    const repo = globalThis.ghConfig.config.repo;

    // Get PR details to get branch ref
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!prResponse.ok) {
      throw new Error(`Failed to get PR details`);
    }

    const prData = await prResponse.json();
    const branchRef = prData.head.ref;

    const branchOwner = prData.head.repo.owner.login;
    const repoName = prData.head.repo.name;

    // Upload file to branch
    const timestamp = Date.now();
    const fileName = file.name
      .replace(/[^a-zA-Z0-9\s.-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/\.([^.]*)$/, `-${timestamp}.$1`);
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${branchOwner}/${repoName}/contents/${PATH_TO_UPLOAD}/${fileName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload ${fileType} ${file.name}`,
          content: base64Content,
          branch: branchRef,
        }),
      },
    );

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload ${fileType}`);
    }

    const uploadData = await uploadResponse.json();
    const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${uploadData.commit.sha}/${PATH_TO_UPLOAD}/${fileName}`;
    const fallbackUrl = uploadData.content.download_url;

    // Insert using provided template
    editor.codemirror
      .getDoc()
      .setValue(
        editor.codemirror.getDoc().getValue() +
          insertTemplate(fileUrl, fallbackUrl),
      );
  } catch (error) {
    if (fileType === "image") {
      editor.codemirror
        .getDoc()
        .setValue(
          editor.codemirror.getDoc().getValue() + insertTemplate(reader.result),
        );
    } else {
      alert("Failed to upload file");
    }
  }

  handleLoaderPostMessage(false);
};

const fetchFileContent = async (filePath) => {
  const token = await globalThis.ghConfig.config.auth;
  const owner = globalThis.ghConfig.config.username;
  const repo = globalThis.ghConfig.config.repo;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `token ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch file content from ${filePath}`);
  }

  const fileContent = await response.json();
  const decodedContent = JSON.parse(decoderBase64ToUtf8(fileContent.content));

  return decodedContent;
};

const handleFileContentUpdate = async (value, content, editorInterface) => {
  const filename = editorInterface.file(value);
  const fileContent = await fetchFileContent(filename);
  const title = fileContent.title;

  return editorInterface.operation.select(content, {
    file: filename,
    title: title,
  });
};

const insertImageTool = {
  name: "Attach Image",
  action: (editor) => {
    let input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      await handleFileUpload(
        file,
        editor,
        "image",
        (url, fallbackUrl) =>
          `\n<img src="${url}" ${fallbackUrl ? `data-fallback-src="${fallbackUrl}"` : ""} />`,
      );
    };
    input.click();
  },
  className: "fa fa-image",
  title: "Attach Image",
};

const insertVideoTool = {
  name: "Attach Video",
  action: (editor) => {
    let input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      await handleFileUpload(
        file,
        editor,
        "video",
        (url, fallbackUrl) =>
          `\n<video src="${url}" ${fallbackUrl ? `data-fallback-src="${fallbackUrl}"` : ""} controls></video>`,
      );
    };
    input.click();
  },
  className: "fa fa-video-camera",
  title: "Attach Video",
};

const storytellingConfig = {
  output: "Story",
  content: "## Sample Section",
  schema: {
    title: "git-clerk",
    type: "object",
    properties: {
      Story: {
        type: "string",
        format: "markdown",
        options: {
          simplemde: {
            toolbar: [
              "bold",
              "italic",
              "strikethrough",
              "heading",
              "|",
              "unordered-list",
              "ordered-list",
              "link",
              "|",
              insertImageTool,
              insertVideoTool,
            ],
            spellChecker: false,
          },
        },
      },
    },
  },
  preview: "/storytelling.html",
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
    path: "/storytelling/<id>.md",
    ...storytellingConfig,
  },
  {
    path: "/narratives/<id>.md",
    ...storytellingConfig,
  },
];

globalThis.automation = [
  {
    title: "Bootstrap Product",
    description:
      "Bootstrap a new file with the correct folder structure and ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
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
        path: (input) => `/products/${input.id}/collection.json`,
        content: (input) => ({ id: input.id, title: input.title }),
      },
      {
        type: "edit",
        path: "/products/catalog.json",
        transform: (content, input) => {
          content.links = [
            ...content.links,
            {
              rel: "child",
              href: `./${input.id}/collection.json`,
              type: "application/json",
              title: input.title,
            },
          ];
          return content;
        },
      },
      {
        type: "navigate",
        path: (input) => `/products/${input.id}/collection.json`,
      },
    ],
  },
  {
    title: "Create Narrative",
    description: "Create a new narrative file with the given ID and title.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
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
        path: (input) => `/narratives/${input.id}.md`,
        content: (input) => `# ${input.title}`,
      },
      {
        type: "navigate",
        path: (input) => `/narratives/${input.id}.md`,
      },
    ],
  },
];

// Example of how to build a custom editor can be found here:
// https://github.com/json-editor/json-editor/blob/master/docs/custom-editor.html
class OSCEditor extends JSONEditor.AbstractEditor {
  register() {
    super.register();
  }

  unregister() {
    super.unregister();
  }

  // Build the editor UI
  build() {
    const options = this.options;
    const description = this.schema.description;
    const theme = this.theme;
    const startVals = this.defaults.startVals[this.key];
    const editorInterface = globalThis.customEditorInterfaces[this.key];

    // Create label and description elements if not in compact mode
    if (!options.compact)
      this.header = this.label = theme.getFormInputLabel(
        this.getTitle(),
        this.isRequired(),
      );
    if (description)
      this.description = theme.getFormInputDescription(
        this.translateProperty(description),
      );
    if (options.infoText)
      this.infoButton = theme.getInfoButton(
        this.translateProperty(options.infoText),
      );

    const selector = document.createElement("select");

    // Add options to the select input
    const enumOptions = this.schema.enum || this.schema.items.enum || [];
    enumOptions.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.text = option.text;
      optionElement.value = option.value;
      selector.appendChild(optionElement);
    });

    this.input = selector;
    this.input.id = this.formname;
    this.input.name = this.formname;
    this.input.value = startVals;
    let previousVal = startVals;

    if (this.schema.type === "array") {
      this.input.multiple = true;
      this.input.size = enumOptions.length > 10 ? 10 : enumOptions.length;

      if (startVals) {
        startVals.forEach((val) => {
          Array.from(this.input.options).forEach((opt) => {
            if (
              opt.value ===
              (editorInterface.customDataDecoder
                ? editorInterface.customDataDecoder(val)
                : val)
            ) {
              opt.selected = true;
            }
          });
        });
      }
    } else if (this.schema.type === "string") {
      this.input.value = startVals ? startVals : "";
    }

    // Add an event listener for changes on the input element
    this.input.addEventListener("change", async (e) => {
      // Retrieve the current content from the JSON editor
      let content = this.jsoneditor.getValue();

      // Check if the content change is valid based on the editor interface's operation type
      const isValidContentChange = editorInterface.operation.on.some(
        (operation) =>
          content.type === operation.type &&
          content["osc:type"] === operation["osc:type"],
      );

      if (isValidContentChange) {
        // Show loader while processing the change
        handleLoaderPostMessage(true);

        // Handle changes for array type schema
        if (this.schema.type === "array") {
          // Unselect previous values
          for (const val of previousVal) {
            content = editorInterface.operation.unselect(content, {
              file: editorInterface.file(
                editorInterface.customDataDecoder
                  ? editorInterface.customDataDecoder(val)
                  : val,
              ),
            });
          }
          // Update previous values with the newly selected options
          previousVal = Array.from(e.target.selectedOptions).map((option) =>
            editorInterface.customDataEncoder
              ? editorInterface.customDataEncoder(option.value)
              : option.value,
          );
          // Update content with the new selections
          for (const val of previousVal) {
            content = await handleFileContentUpdate(
              editorInterface.customDataDecoder
                ? editorInterface.customDataDecoder(val)
                : val,
              content,
              editorInterface,
            );
          }
        } else {
          // Handle changes for non-array type schema
          if (previousVal)
            content = editorInterface.operation.unselect(content, {
              file: editorInterface.file(previousVal),
            });
          // Update previous value with the newly selected option
          previousVal = e.target.value;

          // Update content with the new selection
          if (previousVal) {
            content = await handleFileContentUpdate(
              previousVal,
              content,
              editorInterface,
            );
          }
        }

        // Set the updated content back to the JSON editor
        content[this.key] = previousVal;
        this.jsoneditor.setValue(content);

        // Scroll the input into view and hide the loader after a delay
        setTimeout(() => {
          this.input.scrollIntoView({ block: "center" });
          handleLoaderPostMessage(false);
        }, 300);
      } else {
        // If the content change is not valid, update the value directly
        this.value =
          this.schema.type === "array"
            ? Array.from(e.target.selectedOptions).map((option) => option.value)
            : e.target.value;

        // Trigger the onChange event
        this.onChange(true);
      }
    });

    this.control = theme.getFormControl(
      this.label,
      this.input,
      this.description,
      this.infoButton,
    );

    this.container.appendChild(this.control);
  }

  // Destroy the editor and remove all associated elements
  destroy() {
    if (this.label && this.label.parentNode)
      this.label.parentNode.removeChild(this.label);
    if (this.description && this.description.parentNode)
      this.description.parentNode.removeChild(this.description);
    if (this.input && this.input.parentNode)
      this.input.parentNode.removeChild(this.input);
    super.destroy();
  }
}

const selectFunc = (content, { file, title }) => {
  content.links = [
    ...content.links,
    {
      rel: "related",
      href: `../../${file}`,
      type: "application/json",
      title: title,
    },
  ];
  return content;
};

const unselectFunc = (content, { file }) => {
  content.links = content.links.filter((link) => link.href !== `../../${file}`);
  return content;
};

const operationOn = [
  {
    type: "Collection",
    "osc:type": "product",
  },
  {
    type: "Collection",
    "osc:type": "project",
  },
];

const saveFunc = async (
  newIds,
  oldIds,
  customEditorInterface,
  childPath,
  childTitle,
  session,
  { createAndUpdateFile, getFileDetails, stringifyIfNeeded },
) => {
  // Convert single ID strings to arrays for consistent handling
  const newIdsArr = !Array.isArray(newIds)
    ? [newIds]
    : customEditorInterface.customDataDecoder
      ? newIds.map(customEditorInterface.customDataDecoder)
      : newIds;
  const oldIdsArr = !Array.isArray(oldIds)
    ? [oldIds]
    : customEditorInterface.customDataDecoder
      ? oldIds.map(customEditorInterface.customDataDecoder)
      : oldIds;

  // Only proceed if the IDs have actually changed
  if (newIdsArr && oldIdsArr && newIdsArr.toString() !== oldIdsArr.toString()) {
    const loaderEle = document.getElementById("loader-text");

    // Handle removed links - remove child link from files that are no longer selected
    const removedIds = oldIdsArr.filter((id) => !newIdsArr.includes(id));
    for (let id of removedIds) {
      const path = customEditorInterface.file(id);
      loaderEle.innerText = `Removing child link from ${path}`;
      const fileDetails = await getFileDetails(session, path);
      if (fileDetails.status !== "error") {
        let content = JSON.parse(decoderBase64ToUtf8(fileDetails.content));
        // Remove the link to this child from the file's links array
        content.links = content.links.filter(
          (link) => link.href !== `../../${childPath}`,
        );

        await createAndUpdateFile(
          session,
          path,
          path,
          stringifyIfNeeded(content, decoderBase64ToUtf8(fileDetails.content)),
          fileDetails.sha,
        );
      }
    }

    // Handle added links - add child link to newly selected files
    const addedIds = newIdsArr.filter((id) => !oldIdsArr.includes(id));
    for (let id of addedIds) {
      const path = customEditorInterface.file(id);
      loaderEle.innerText = `Adding child link to ${path}`;
      const fileDetails = await getFileDetails(session, path);
      if (fileDetails.status !== "error") {
        let content = JSON.parse(decoderBase64ToUtf8(fileDetails.content));
        // Add a new child link to the file's links array
        content.links = [
          ...content.links,
          {
            rel: "child",
            href: `../../${childPath}`,
            type: "application/json",
            title: childTitle,
          },
        ];

        await createAndUpdateFile(
          session,
          path,
          path,
          stringifyIfNeeded(content, decoderBase64ToUtf8(fileDetails.content)),
          fileDetails.sha,
        );
      }
    }
  }
};

const Operation = {
  on: operationOn,
  select: selectFunc,
  unselect: unselectFunc,
  save: saveFunc,
};

globalThis.customEditorInterfaces = {
  "osc:project": {
    type: "string",
    format: "osc-project",
    func: OSCEditor,
    path: "projects",
    file: (pathname) => `projects/${pathname}/collection.json`,
    operation: Operation,
  },
  themes: {
    type: "array",
    format: "osc-themes",
    func: OSCEditor,
    path: "themes",
    file: (pathname) => `themes/${pathname}/catalog.json`,
    operation: Operation,
    customDataEncoder: (data) => ({
      scheme: "https://github.com/stac-extensions/osc#theme",
      concepts: [
        {
          id: data,
        },
      ],
    }),
    customDataDecoder: (data) => data.concepts[0].id,
  },
  "osc:missions": {
    type: "array",
    format: "osc-missions",
    func: OSCEditor,
    path: "eo-missions",
    file: (pathname) => `eo-missions/${pathname}/catalog.json`,
    operation: Operation,
  },
  "osc:variables": {
    type: "array",
    format: "osc-variables",
    func: OSCEditor,
    path: "variables",
    file: (pathname) => `variables/${pathname}/catalog.json`,
    operation: Operation,
  },
};

globalThis.generateEnums = async (
  schemaMetaDetails,
  session,
  cache,
  { getFileDetails },
) => {
  if (schemaMetaDetails.schema.allOf) {
    for (const property of Object.keys(globalThis.customEditorInterfaces)) {
      const propertyAvailable =
        schemaMetaDetails.schema.allOf[1].properties[property];
      if (propertyAvailable) {
        let path = globalThis.customEditorInterfaces[property].path;
        const catalog = await getFileDetails(
          session,
          `${path}/catalog.json`,
          cache,
        );
        const links = JSON.parse(decoderBase64ToUtf8(catalog.content)).links;
        const enumValues = links
          .map((link) =>
            link.rel === "child"
              ? {
                  value: link.href.split("/")[1],
                  text: link.title,
                }
              : null,
          )
          .filter(Boolean);
        if (propertyAvailable.items) {
          propertyAvailable.items.enum = enumValues;
        } else {
          propertyAvailable.enum = [
            {
              value: "",
              text: "Select a value",
            },
            ...enumValues,
          ];
        }
      }
    }
  }

  return schemaMetaDetails;
};
