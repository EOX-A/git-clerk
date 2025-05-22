export default function getTourConfig(id, props) {
  return {
    ...(id ? { id } : {}),
    steps: getSteps(id, props),
  };
}

function getSteps(id, { isEmpty, isPreviewExists }) {
  switch (id) {
    case "sessions-view":
      return getSessionsViewSteps(isEmpty);
    case "sessions-view-empty":
      return getSessionsViewSteps(isEmpty);
    case "session-view":
      return getSessionViewSteps(isEmpty);
    case "session-view-empty":
      return getSessionViewSteps(isEmpty);
    case "file-edit":
      return getFileEditSteps(isPreviewExists);
    case "file-edit-preview":
      return getFileEditSteps(isPreviewExists);
    default:
      return [];
  }
}

function getFileEditSteps(isPreviewExists) {
  return [
    {
      element: "#file-actions",
      popover: {
        title: "File actions",
        description:
          "Run different actions on the file like deleting, renaming or open in github.",
      },
    },
    ...(isPreviewExists
      ? [
          {
            element: "#preview-toggle-btn",
            popover: {
              title: "Toggle preview",
              description: "Toggle the preview of the file.",
            },
          },
          {
            element: "#preview-frame",
            popover: {
              title: "Preview",
              description: "Preview the file.",
            },
          },
          {
            element: "#preview-expand-btn",
            popover: {
              title: "Expand preview",
              description: "Expand the preview of the file.",
            },
          },
        ]
      : []),
    {
      element: "#file-editor-form",
      popover: {
        title: "File Editor",
        description: "Edit the file using the editor.",
      },
    },
    {
      element: "#primary-action-btn",
      popover: {
        title: "Save File",
        description:
          "Once the file is edited, click on the save button to save the file.",
      },
    },
  ];
}

function getSessionViewSteps(isEmpty) {
  const lastSteps = isEmpty
    ? [
        {
          element: "#file-actions",
          popover: {
            title: "No files found",
            description:
              "Add/update or start with any of the actions to work on any files.",
          },
        },
      ]
    : [
        {
          element: ".files-view:first-child",
          popover: {
            title: "View each file",
            description: "Click on a file to view the details of the file.",
          },
        },
        {
          element: ".files-view:first-child .v-list-item__append",
          popover: {
            title: "Action buttons for each file",
            description:
              "Run different actions on each file like deleting or duplicating it.",
          },
        },
      ];

  return [
    {
      element: "#primary-action-menu-btn",
      popover: {
        title: "Add or update a file",
        description: "Click on the button to add, update or bootstrap a file.",
      },
    },
    {
      element: "#session-action-menu",
      popover: {
        title: "Session actions",
        description:
          "Run different actions on the session like deleting, renaming or open in github.",
      },
    },
    {
      element: "#review-btn",
      popover: {
        title: "Request a review",
        description: "Request a review to get feedback on the session.",
      },
    },
    {
      element: "#deployed-preview-btn",
      popover: {
        title: "Deployed preview",
        description: "Open the deployed preview of the session.",
      },
    },
    {
      element: ".session-icon",
      popover: {
        title: "Session State",
        description:
          "Indicate current state of the session whether it's on draft, open, closed or merged.",
      },
    },
    ...lastSteps,
  ];
}

function getSessionsViewSteps(isEmpty) {
  const lastSteps = isEmpty
    ? [
        {
          element: ".v-empty-state__actions",
          popover: {
            title:
              "Create a new session because you don't have any sessions yet",
            description:
              "Click on the button to create a new session and add your first session.",
          },
        },
      ]
    : [
        {
          element: ".sessions-view:first-child",
          popover: {
            title: "View each session",
            description:
              "Click on a session to view the details of the session.",
          },
        },
        {
          element: ".sessions-view:first-child .v-list-item__append",
          popover: {
            title: "Action buttons for each session",
            description:
              "Run different actions on each session like deleting, requesting review or open in github.",
          },
        },
      ];

  return [
    {
      element: "#primary-action-btn",
      popover: {
        title: "Start a new session",
        description:
          "Allows you to create a new session to share your ideas and propose updates.",
      },
    },
    {
      element: ".open-session-filter",
      popover: {
        title: "Check open sessions",
        description: "Shows all the sessions that are currently open.",
      },
    },
    {
      element: ".closed-session-filter",
      popover: {
        title: "Check closed sessions",
        description: "Shows all the sessions that are currently closed.",
      },
    },
    ...lastSteps,
  ];
}
