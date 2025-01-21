// config.js
globalThis.ghConfig = {
  githubRepo: "",
  githubAuthToken: () => new Promise((resolve) => resolve("")),
};

const PATH_TO_UPLOAD = 'assets';

// Shared upload functionality
const handleFileUpload = async (file, editor, fileType, insertTemplate) => {
  // Check if file is correct type
  if (!file.type.startsWith(fileType + '/')) {
    alert(`Please select a ${fileType} file`);
    return;
  }

  // Check file size (10MB = 10 * 1024 * 1024 bytes)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB');
    return;
  }

  // Create a FormData object to hold the file data
  const formData = new FormData();
  formData.append('file', file);

  window.parent.postMessage({
    type: 'EDITOR_FILE_UPLOADING'
  }, "*");

  // Convert file to base64
  const reader = new FileReader();
  const base64Promise = new Promise((resolve) => {
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
  });
  reader.readAsDataURL(file);
  const base64Content = await base64Promise;

  try {
    // Get PR number from URL path
    const pathParts = window.location.pathname.split('/');
    const prNumber = pathParts[1]; // Get PR number like "62"

    // Get session details to get branch info
    const token = await globalThis.ghConfig.config.auth;
    const owner = globalThis.ghConfig.config.username;
    const repo = globalThis.ghConfig.config.repo;

    // Get PR details to get branch ref
    const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!prResponse.ok) {
      throw new Error(`Failed to get PR details`);
    }

    const prData = await prResponse.json();
    const branchRef = prData.head.ref;

    const branchOwner = prData.head.repo.owner.login;
    const repoName = prData.head.repo.name;

    // Upload file to branch
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9\s.-]/g, '').replace(/\s+/g, '-').replace(/\.([^.]*)$/, `-${timestamp}.$1`);
    const uploadResponse = await fetch(`https://api.github.com/repos/${branchOwner}/${repoName}/contents/${PATH_TO_UPLOAD}/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Upload ${fileType} ${file.name}`,
        content: base64Content,
        branch: branchRef
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload ${fileType}`);
    }

    const uploadData = await uploadResponse.json();
    const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${uploadData.commit.sha}/${PATH_TO_UPLOAD}/${fileName}`;

    // Insert using provided template
    editor.codemirror.getDoc().setValue(
      editor.codemirror.getDoc().getValue() + insertTemplate(fileUrl)
    );

  } catch (error) {
    if(fileType === 'image') {
      editor.codemirror.getDoc().setValue(
        editor.codemirror.getDoc().getValue() + insertTemplate(reader.result)
      );
    } else {
      alert('Failed to upload file');
    }
  }

  window.parent.postMessage({
    type: 'EDITOR_FILE_UPLOADED'
  }, "*");
};

const insertImageTool = {
  name: "Attach Image",
  action: customFunction = (editor) => {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = async e => {
      const file = e.target.files[0];
      await handleFileUpload(
        file, 
        editor, 
        'image',
        (url) => `\n![](${url})`
      );
    };
    input.click();
  },
  className: "fa fa-image",
  title: "Attach Image",
};

const insertVideoTool = {
  name: "Attach Video",
  action: customFunction = (editor) => {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = async e => {
      const file = e.target.files[0];
      await handleFileUpload(
        file, 
        editor, 
        'video',
        (url) => `\n<video src="${url}" controls></video>`
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
                insertVideoTool
              ],
              spellChecker: false,
            },
          },
        },
      },
    },
    preview: "/storytelling.html"
}

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
    ...storytellingConfig
  },
  {
    path: "/narratives/<id>.md",
    ...storytellingConfig
  },
]

globalThis.automation = [
  {
    title: "Bootstrap Product",
    description: "Bootstrap a new file with the correct folder structure and ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1
        },
        title: {
          type: "string",
          minLength: 1
        }
      },
      required: ["id", "title"]
    },
    steps: [
      {
        type: "add",
        path: (input) => `/products/${input.id}/collection.json`,
        content: (input) => ({ id: input.id, title: input.title })
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
              title: input.title
            },
          ]
          return content
        }
      },
      {
        type: "navigate",
        path: (input) => `/products/${input.id}/collection.json`
      }
    ]
  },
  {
    title: "Create Narrative",
    description: "Create a new narrative file with the given ID and title.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1
        },
        title: {
          type: "string",
          minLength: 1
        }
      },
      required: ["id", "title"]
    },
    steps: [
      {
        type: "add",
        path: (input) => `/narratives/${input.id}.md`,
        content: (input) => `# ${input.title}`
      },
      {
        type: "navigate",
        path: (input) => `/narratives/${input.id}.md`
      }
    ]
  }
]