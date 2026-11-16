# git-clerk

An Open-Source Content Management System based on Git workflows with a friendly file-editing GUI.

![](./readme.png)

## Purpose

The GitHub UI offers a lot of functionalities which can be overwhelming with users not familiar with Git. This software offers an abstraction on top of GitHub to allow easy creation of forks, PRs, and commits on behalf of the user. On top of that, it offers an automatically rendered form GUI (based on provided JSON schemas) which makes the creation of files easier.

## Functionality

As soon as the user starts a new "Session" (PR), a fork for the target repository is automatically created for the user if not yet present. It also creates an empty commit and a PR for the user. As soon as the user creates/changes files, these are "saved" as commits. Then, the user can mark a session as ready (turn the draft PR into an open PR), and receive feedback regarding failing pipelines or requested changes on the PR.

## Configuration

The configuration for git-clerk is done via the [config file](/public/config.js) by setting `globalThis.gitClerkConfig`. In its most basic form, the config looks like this:

```js
globalThis.gitClerkConfig = {
  // The target repository to create PRs against
  githubRepo: "EOX-A/git-clerk-demo",
  // The current user's GH token, either as string or (sync or async) function
  // Example: githubAuthToken: () => "<github-token>"
  // Example: githubAuthToken: () => new Promise((resolve) => fetch("<endpoint>").then(() => resolve(token))),
  githubAuthToken: "ghp_myGithubAuthToken",
};
```

You can also set this GitHub config via an `.env` variable, by passing `GITCLERK_GITHUB_TOKEN` and `GITCLERK_GITHUB_REPO` see e.g. [.env.example](./.env.examle).

### Permission required by GitClerk on GitHub

| Permission           | Classic token / OAuth App                         | GitHub App                    | Fine-grained PAT                                                                 | Needed for                                                  |
| -------------------- | ------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Repository access    | `repo` (or `public_repo` if everything is public) | Metadata: Read                | Metadata: Read, plus access to the target and the forks under the resource owner | Reading repos and forks                                     |
| Contents             | `repo`                                            | Contents: Read and write      | Contents: Read and write                                                         | Files, branches, commits, forks, merge-upstream             |
| Pull requests        | `repo`                                            | Pull requests: Read and write | Pull requests: Read and write                                                    | Sessions (create, list, rename, close, submit for review)   |
| Checks               | `repo`                                            | Checks: Read                  | Checks: Read                                                                     | CI status on sessions                                       |
| Organisation members | `read:org`                                        | Members: Read                 | Members: Read (only when the resource owner is an organisation)                  | Organisation forks, only with `forkingLocation.org`         |
| Workflows            | `workflow`                                        | Workflows: Read and write     | Workflows: Read and write                                                        | Optional, only for editing files under `.github/workflows/` |

**Notes:**

- A GitHub App must be installed on the user's account and in every organisation whose fork should be usable.
- A fine-grained PAT has a single resource owner, so it cannot combine personal and organisation forks.

## Features

### `schemaMap`

With the `schemaMap`, one can configure which file paths are associated with which JSON schemas to automatically render input forms.

#### `schema` and `url`

```js
globalThis.gitClerkConfig = {
  [...]
  schemaMap: [
    {
      path: "/folder-a/file.json",
      schema: {
        title: "my-schema",
        type: "object",
        properties: {
          foo: {
            type: "string"
          }
        }
      },
      jsonform: {
        options: {} // jsonform options
      }
    },
    {
      path: "/folder-a/<id>/file.json",
      url: "https://my-schema-site.com/schemas/folder-a/schema.json",
    },
    [...]
  ],
  [...]
};
```

In this example, editing the file `/folder-a/file.json` loads the corresponding JSON schema passed via the `schema` property, whereas editing a file with the pattern `/folder-a/<id>/file.json` loads the corresponding JSON schema `https://my-schema-site.com/schemas/folder-a/schema.json`.
A dynamic path placeholder segments starts and ends with `<...>` eg - `<title>`, `<date>`, `<id>`, `<lorem-ipsum>` etc, which loads the corresponding JSON schema.

#### `content`

Additionally to providing a JSON schema, the form can also be autofilled with initial content:

```js
globalThis.gitClerkConfig = {
  [...]
  schemaMap: [
    {
      path: "/folder-a/file.json",
      schema: {
        title: "my-schema",
        type: "object",
        properties: {
          foo: {
            type: "string"
          }
        }
      },
      content: {
        foo: "bar"
      }
    },
    [...]
  ],
  [...]
};
```

In this example, the generated form will automatically fill the value "bar" into the `foo` field.

#### `output`

By default, the entire JSON structure is stored (commited) as a JSON file. But one can also specify a specific property which should be stored in the file instead. This is handy when e.g. editing markdown or yaml files:

```js
globalThis.gitClerkConfig = {
  [...]
  schemaMap: [
    {
      path: "/folder-a/file.md",
      schema: {
        title: "my-schema",
        type: "object",
        properties: {
          foo: {
            type: "string",
            format: "markdown"
          }
        }
      },
      output: "foo"
    },
    [...]
  ],
  [...]
};
```

In this example, the markdown content of `foo` is commited as file `file.md`.

#### `preview`

If a `preview` is defined, then the editor GUI only takes half of the screen, and the other half renders the referenced preview HTML inside an iframe. Whenever the editing form updates, it sends a `postMessage` including a `CustomEvent` to the preview iframe with the `event.type` of `SCHEMA_DATA_EDITOR_UPDATE` and the `event.detail` being the JSON output of the editor. The preview iframe can also emit a `CustomEvent` to the parent with the `event.type` of `SCHEMA_DATA_PREVIEW_UPDATE`, which then updates the editor (in `event.detail` it expects the JSON value that matches the currently loaded JSON schema).

An example for this setup can be seen in [here](https://github.com/EOX-A/git-clerk/blob/f658c6ec4604d6f0da7fe237f3f56e27a8fa0e58/public/storytelling.html).

### `automation`

Sometimes, multiple edits need to be done together (e.g. creating a file in the correct folder structure, putting initial content in that file, and referencing this file in a third file). To make users' lives easier, git-clerk offers automations:

```js
globalThis.gitClerkConfig = {
  [...]
  automation: [
    {
      title: "Bootstrap Product", // displayed in the UI as button
      description: "Bootstrap a new file with the correct folder structure and ID.", // displayed in the UI as description for this automation
      inputSchema: { // the input form when the user selects this automation
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
      steps: [ // the steps the automation will perform
        {
          type: "add", // add a file
          path: (input) => `/products/${input.id}/collection.json`, // references the above defined form output property "id"
          content: (input) => ({ id: input.id, title: input.title }) // sets the content of the added file, referencing "id" and "title" from the form
        },
        {
          type: "edit", // edits an existing file
          path: "/products/catalog.json",
          transform: (content, input) => { // transforms the content of an existing file
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
          type: "navigate", // navigates to the specified file and opens the editing view
          path: (input) => `/products/${input.id}/collection.json`
        }
      ]
    },
    [...]
  ],
  [...]
};
```

Automations can also be triggered via -

1. URL Query Parameters - for this, the automation requires an additional `id` parameter which is referenced by the `automation` query parameter. The automation can be triggered within a session, or you can supply `session` or `sessionNumber` parameters:
   - `session`: The title of the session. If an open session/pull request with this exact title already exists for the user, git-clerk will reuse and open that existing session. If no matching open session is found, it will automatically create a new one. (Note: If a name collision occurs on GitHub, such as during manual creation or with closed/orphaned branches, git-clerk will still automatically append an incremented suffix like `(1)`, `(2)`, etc., to prevent branch collisions).
   - `sessionNumber`: The specific number of an existing session (pull request) to target directly.

   All other query parameters (except `automation`, `session`, and `sessionNumber`) are passed as key-value pairs into the automation input (and thus can further be used in automation steps).

   Example:`https://my-git-clerk-instance.com?session=My New Session&automation=automation-id&field1=value-field1&field2=value-field2`

2. `postMessage` from parent tab - when git-clerk is opened from another application, it sends an `'automation-ready'` message to its parent window or opener once it is loaded. The parent can then listen for this message and reply with a `postMessage` containing the automation data as a JSON string. The automation data should include `session` or `sessionNumber` (similar to url query params), `automation` (automation id), and any other key-value pairs required by the automation input. This is only applicable if `allowedOrigins` is provided in `config.js`.

   Example:

   ```js
   // config.js
   const allowedOrigins = ["http://example.website"];
   globalThis.gitClerkConfig.allowedOrigins = allowedOrigins;
   ```

   ```html
   <a href="/" target="_blank" rel="opener">Git Clerk</a>
   ```

   ```javascript
   const automationData = {
     session: "My New Session",
     automation: "automation-id",
     field1: "value-field1",
     field2: "value-field2",
   };
   let readyAutomation = false; // This will prevent event from triggering multiple times.
   window.addEventListener("message", (event) => {
     if (event.data === "automation-ready" && !readyAutomation) {
       event.source.postMessage(JSON.stringify(automationData), "\*");
       readyAutomation = true;
     }
   });
   ```

Example - [external automation through js](/public/example-external-automation.html)

### Custom Editor Interface

Git Clerk uses `eox-jsonform` to render applications based on different JSON editor schemas. `eox-jsonform` contains editor interfaces for each of the primitive JSON types as well as a few other specialized ones. For those who need custom editor interfaces/inputs based on any custom format, they can easily build their own custom editor interface using `JSON Editor`'s `AbstractEditor` class inside `config.js`.

```js
globalThis.gitClerkConfig = {
[...]
customEditorInterfaces: {
 "some-format-key-name": {
   type: "string", // Any data type for the custom editor
   format: "any-custom-format", // Any custom format key
   func: CustomEditorInterface, // Build any custom editor using `JSON Editor`'s `AbstractEditor` class
   ... // Add any key values as per your business logic
 },
},
[...]
};
```

An example for this setup can be seen in [here](https://github.com/EOX-A/git-clerk/blob/bfa157a499ef488fe3b0ebf3215fb9368d552496/public/config.js#L680).

### Generate Enums

Sometimes input enums need to be dynamically fetched from an API or other data source to update the schema. `globalThis.gitClerkConfig.generateEnums` inside `config.js` allows users to fetch dynamic enums according to their business logic and then return the updated schema.

```js
globalThis.gitClerkConfig = {
  [...]
  generateEnums: async (
    schemaMetaDetails,
    session,
    cache,
    { getFileDetails },
  ) => {
    ... // Fetch dynamic enums based on the API and update the schemaMetaDetails
    return schemaMetaDetails; // Return the updated schema based on the processing above
  },
  [...]
};
```

An example for this setup can be seen in [here](https://github.com/EOX-A/git-clerk/blob/bfa157a499ef488fe3b0ebf3215fb9368d552496/public/config.js#L724).

### Deployed Preview Link

Git Clerk allows you to configure a custom preview link for your sessions/PRs. This can be useful if you have preview deployments set up for your sessions. You can configure this by adding a `deployedPreviewLink` function to your config that returns the preview URL:

```js
globalThis.gitClerkConfig = {
  [...]
  deployedPreviewLink: (sessionDetail) => {
    const { number } = sessionDetail;
    return `https://deploy-preview-url.com/${number}/preview.html`;
  }
  [...]
};
```

### Disable manual file creation

Git Clerk allows you to configure and disable manual file creation. This can be useful if you like the user to only use automation and editing the files. This will disable manual file creation and upload in file browser and suggestion in empty session. You can configure this by adding a `disableManualFileCreation` function to your config that returns a boolean value:

```js
globalThis.gitClerkConfig = {
  [...]
  disableManualFileCreation: true // boolean value - true or false
  [...]
};
```

### Add internationalization

Git Clerk allows you to configure I18n (internationalization) using config. This can be useful if you like the users to have textual content in different languages. You can configure this by adding a `i18n` constant to your config that returns an i18n options:

```js
globalThis.gitClerkConfig = {
  [...]
  i18n: {
    locale: "en",
    fallbackLocale: "en",
    messages: {
      en: {
        buttonText: {
          automation: "Automation",
        },
      },
      de: {
        buttonText: {
          automation: "Automatisierung",
        },
      },
    },
  }
  [...]
};
```

You can read more about i18n options [here](https://vue-i18n.intlify.dev/guide/essentials/syntax).

### Organisation forks and roles

By default every user works in her/his own fork and sees only the sessions (PRs) whose branch lives in that fork. With `forkingLocation` you can additionally allow sessions in an **organisation fork** that is shared by all members:

```js
globalThis.gitClerkConfig = {
  [...]
  forkingLocation: {
    personal: true, // sessions in the user's personal fork (default: true)
    org: true, // sessions in organisation forks (default: false)
  },
  [...]
};
```

When `org` is enabled, git-clerk lists the organisations the user is a member of (this needs a token with the `read:org` scope) and, in the same load step, asks GitHub for the forks of the target repository the user is affiliated with (owned, outside collaborator, or through an organisation membership). Org forks the user can push to without being a member are added as well. The resulting roles are:

| Role                                            | Fork repo                                                 | View sessions                    | Create session                           | Edit files          | Rename / Delete / Submit |
| ----------------------------------------------- | --------------------------------------------------------- | -------------------------------- | ---------------------------------------- | ------------------- | ------------------------ |
| **Repo member** (write on target)               | Personal ✅, Org ✅                                       | All PRs ✅ (native + every fork) | Personal ✅, Org ✅                      | ✅ all              | ✅ all                   |
| **Personal** (no write, no org)                 | Personal ✅, Org ❌                                       | Personal ✅, Org ❌              | Personal ✅, Org ❌                      | Personal ✅, Org ❌ | Personal ✅, Org ❌      |
| **Org member**                                  | Personal ✅, Org ✅ (unless the org forbids member forks) | Personal ✅, Org ✅              | Personal ✅, Org ✅                      | Personal ✅, Org ✅ | Personal ✅, Org ✅      |
| **Outside collaborator** (write on an org fork) | Personal ✅, Org ❌                                       | Personal ✅, Org ✅              | Personal ✅, Org ✅ (existing fork only) | Personal ✅, Org ✅ | Personal ✅, Org ✅      |
| **Read-only collaborator**                      | Personal ✅, Org ❌                                       | Personal ✅, Org ❌              | Personal ✅, Org ❌                      | Personal ✅, Org ❌ | Personal ✅, Org ❌      |

A scope switcher above the sessions list toggles between _All PRs_ (repo members: everything, the default) or _All Repos_ (everyone else: personal plus every organisation fork, the default), _Personal_, and each organisation that already holds a fork. Session branches in an org fork are still prefixed with the user's login (`<login>/<slug>`), so members never collide. In organisation scope each session shows its author. Everyone with push access to the org fork can edit files in any of its sessions.

External automations can target an organisation fork by adding `forkOwner: "<org-login>"` to the payload or query parameters.

## Development

### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

### Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

### Project Setup

```sh
npm install
```

#### Compile and Hot-Reload for Development

```sh
npm run start
```

This starts both versions in separate Vite servers:

- v1: `src/`, Vue and Vuetify, at http://localhost:3000.
- v2: `src2/`, Vue and Tailwind CSS, at http://localhost:3001.

To run either version independently:

```sh
npm run start:v1
npm run start:v2
```

V2 shows a centered chat starter at `/` and a selected session at
`/:sessionNumber`, without reloading the page. The conversation workspace comes
later. The starter accepts local draft text and removable file attachments, automation
templates with editable blanks, and model selection from the design reference.
Attachments stay in memory; nothing is uploaded. Repository selection is hidden,
speech input is removed, and sending remains disabled until the backend is ready.
The centered **Create Session** link below the composer opens a session-name modal
with the v1 “What is a session?” explanation. Submitting creates a draft session in
your personal fork and opens it, without an organization or repository selector.
A missing personal fork is created automatically; an existing fork is validated and
fast-forwarded without force before the session branch is created. Creation errors
can be retried in the same dialog without duplicating its branch or PR.
`src2/main.js` mounts the app configured in `src2/app.js`; `src2/App.vue`
keeps navigation mounted around the router. Navigation components live in
`src2/components/nav/` and support a collapsed rail, mobile drawer, and light/dark
appearance. The sidebar starts at 264 px; drag its right edge to resize
between 240 and 360 px on desktop. Double-click the edge to reset, or focus it
and use the arrow keys (Enter resets).

V2 loads the shared `/config.js` and accepts the same GitHub configuration as v1:
`globalThis.ghConfig` or `globalThis.gitClerkConfig.ghConfig`, with `githubRepo`
(`owner/repository`) and `githubAuthToken` (string or sync/async function).
`GITCLERK_GITHUB_REPO` and `GITCLERK_GITHUB_TOKEN` remain the local `.env` fallbacks.
Keep credentials out of source control.

The sidebar uses Octokit to read PR sessions, newest activity first, including
Draft, Open, Merged, and Closed. Repository writers see all PRs; other accounts
see sessions from their enabled personal and writable organization forks, using
the existing `forkingLocation` config. Load more walks subsequent GitHub pages.
Use the Sessions filter button to toggle Draft/Open/Merged/Closed, sort by
recent activity, PR number, title, or status. Grouping is hidden for now,
until organization support is introduced. The active-filter summary clears all options
back to the defaults. Opening filters finishes loading the remaining scoped sessions for complete
counts. Changing status or sort, or clearing those filters, fetches a fresh list
from page one. Older requests are cancelled and cannot overwrite newer results.
Filtering and sorting apply to the freshly fetched scoped pages; grouping reuses
them. Failed requests can be retried.
Preferences stay in the current app session across navigation and sidebar collapse.
Selecting a row loads a fresh two-line session header: title, PR status, checks,
repository, PR link, and branch name. Active PRs refresh every 30 seconds while
visible and on window focus. The session options menu supports rename, open on
GitHub, and delete (close the PR and delete its head branch), with confirmation
dialogs and permission checks. Drafts with changes can be submitted for review
when checks pass or no checks are configured. Closed/merged sessions are read-only;
default branches and unwritable forks cannot be deleted. Partial deletion errors
are reported without hiding that the PR was closed.
Missing configuration and request failures show a retryable message. GitHub
operations stay behind `src2/api/index.js` so the UI can later use a backend.
Loading sessions does not create or sync forks; manual session creation does.
The conversation workspace and its
mobile Chat/Files switch will be added separately.

Session files open in tabs, with a Files/Changes drawer. Clicking either list
opens a normal file; “View changes” explicitly opens its saved PR diff.
Configured `schemaMap` previews use an iframe and the v1 postMessage contract.
Preview is the default when available. Editor (a configured `eox-jsonform`) and
Source are mutually exclusive and can both be switched off to show only the preview.
Files without a preview start in Source; files without a schema have no Editor.
The split divider supports dragging and arrow keys; narrow layouts show the
selected editing pane at full width. The read-only status tag follows the filename,
and “View file” opens GitHub.

Drafts remain in memory across tab switches. Save changes or Ctrl/⌘+S validates
configured schemas, commits to the actual head branch with SHA conflict protection,
and refreshes session details. Closing dirty tabs or leaving the session offers
Save/Discard/Cancel. Failed saves preserve drafts. Closed, merged, deleted and
unwritable files remain read-only; deleted files show the base version. Binary,
non-UTF-8 and files over 1 MiB use a GitHub fallback.

For browser checks without credentials or real repository writes, run
`npm run test:workspace:v2`, then open
`http://127.0.0.1:3002/test/fixtures/v2-workspace/index.html`.
The fixture provides mock saves, conflicts, configured previews and forms.
Append `?create` to exercise manual session creation and redirection with mocked
GitHub responses.

Run the focused API regression tests with `npm run test:v2` (mocked GitHub data).

Temporary design references live in `src2/docs/` and are excluded from Tailwind
scanning and formatting. Design colours, typography, spacing, radii, and shadows
are defined as Tailwind tokens in `src2/assets/main.css`. It follows v1's JavaScript, Vue Composition API,
`@/` imports, and directory conventions, with feature folders added as they are implemented. Tailwind replaces Vuetify in v2, using the
[Tailwind Vite plugin](https://tailwindcss.com/docs/installation/using-vite).
Each version resolves `@/` to its own source directory.

#### Compile and Minify for Production

```sh
npm run build
```

The default build remains v1 in `dist/`. Build and preview v2 separately with:

```sh
npm run build:v2
npm run preview:v2
```

V2 builds into `dist-v2/`, keeping the existing v1 release output separate.
