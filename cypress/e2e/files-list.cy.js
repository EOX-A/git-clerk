// Import required dependencies and test data
import { GITHUB_HOST_REGEX } from "../enums";
import ghConfig from "../fixtures/gh-config.json";
import files from "../fixtures/files:get.json";
import content from "../fixtures/content:get.json";
import pullsData from "../fixtures/pulls:get.json";
import { checkTour } from "../helper";

// State flags to control test behavior
let sessionName = false;
let sessionTitle = "Renamed Session";
let duplicateFile = false;
let isManualContent = false;
let isUploadFile = false;

// Test file path constant
const fileName = "products/foo2/collection.json";

describe("Files list related tests", () => {
  beforeEach(() => {
    // Intercept GET request for pull request details
    cy.intercept(
      {
        method: "GET",
        url: `${GITHUB_HOST_REGEX}/repos/${ghConfig.username}/${ghConfig.repo}/pulls/123`,
      },
      (req) => {
        let tempPulls = pullsData;
        if (sessionName) {
          tempPulls.title = sessionTitle;
        }
        req.reply({
          statusCode: 200,
          body: tempPulls,
          headers: {
            "content-type": "application/json",
          },
        });
      },
    ).as("getRepo");

    // Intercept GET request for files list
    cy.intercept(
      {
        method: "GET",
        url: new RegExp(
          `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+/files`,
        ),
      },
      (req) => {
        let tempData = files;
        // Add duplicate file if flag is set
        if (duplicateFile) {
          tempData.push(files[0]);
          tempData[tempData.length - 1].filename = fileName;
        }
        // Add uploaded file if flag is set
        if (isUploadFile) {
          tempData.push({
            filename: "eo-missions/code.js",
            status: "added",
            additions: 34,
            deletions: 0,
            changes: 34,
          });
          isUploadFile = false;
        }

        req.reply(tempData);
      },
    ).as("getFiles");

    // Intercept GET request for file contents
    cy.intercept(
      {
        method: "GET",
        url: new RegExp(
          `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
        ),
      },
      (req) => {
        let tempContent = content;
        if (isManualContent) {
          tempContent.path = "manual-file.txt";
          tempContent.content = "";
          isManualContent = false;
        }
        req.reply(tempContent);
      },
    ).as("getContent");
  });

  it("Automation through url", () => {
    let location;
    cy.wait(1000);
    cy.visit(
      "?session=update%203d%20earth&automation=add-file&content=ewogICJpZCI6ICI2MTFjNWQxNC03MDg3LTQ4MjAtYWNmNS02NDlhYWJjMjI0MjMiLAogICJmb28iOiAiRm9vIiwKICAiYmFyIjogZmFsc2UsCiAgImN1c3RvbSI6ICIiCn0K",
    );
    cy.wait("@createPulls").then(() => {
      cy.location("pathname", { timeout: 10000 }).should("eq", "/123");
    });
    cy.get("eox-jsonform#automation-form")
      .shadow()
      .within(() => {
        cy.get(
          ".je-indented-panel .form-control input[name='root[id]']",
        ).should("exist");
        cy.get(".je-indented-panel .form-control input[name='root[id]']").then(
          ($input) => {
            location = btoa(`foo/bar/${$input.val()}.json`);
            cy.wrap(location).as("encodedPath");
          },
        );
      });
    cy.wait("@getContent", { timeout: 10000 });
    cy.get("@encodedPath").then((location) => {
      cy.location("pathname", { timeout: 10000 }).should((path) => {
        expect(path).to.match(/^\/123\/[A-Za-z0-9+/=]+$/);
      });
    });

    // Check if the file is loaded
    cy.get("eox-jsonform").should("exist");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        // Check if the file is loaded
        cy.get(".je-indented-panel .ace_editor .ace_line").should(
          "have.text",
          atob(content.content).replaceAll("\n", ""),
        );
      });
  });

  // Test to check if the tour is rendered and close the tour
  it("Tour check and click next button", () => {
    cy.visit("/123");
    cy.wait("@getFiles");
    cy.wait(1000);
    checkTour();
  });

  // Test that files list renders correctly
  it("Render files list", () => {
    cy.get(".files-list", { timeout: 12000 }).should(
      "have.length",
      files.length,
    );
  });

  // Test that file titles match expected values
  it("Validate files list items with title name", () => {
    cy.get(".file-title").each((fileElement, index) => {
      cy.wrap(fileElement).should("have.text", files[index].filename);
    });
  });

  it("Rename session", () => {
    sessionName = true;
    cy.get("#session-action-menu").click();
    cy.get("#rename-session-btn").click();
    cy.get(".rename-session-container .v-field__input")
      .clear()
      .type(sessionTitle, {
        delay: 100,
      });
    cy.get(".rename-session-container .v-btn.bg-primary").click();
    cy.get(".v-card-actions .v-btn.bg-success").click();
    cy.wait("@getRepo");
    cy.get(".v-breadcrumbs-item--disabled div").should(
      "have.text",
      sessionTitle,
    );
  });

  // Test file duplication functionality
  it("Duplicate a file", () => {
    duplicateFile = true;
    cy.get(".files-list").eq(0).find(".v-btn .mdi-content-copy").click();
    cy.get(".files-list").eq(0).find(".v-field__input").type("products/", {
      delay: 100,
    });
    cy.get(".files-list").eq(0).find(".v-field__input").type("foo2/", {
      delay: 100,
    });
    cy.get(".files-list")
      .eq(0)
      .find(".v-field__input")
      .type("collection.json", {
        delay: 100,
      });
    cy.get(".files-list")
      .eq(0)
      .find(".session-create-field .mdi-content-copy")
      .click();
    cy.wait("@putContent");
    cy.location("pathname", { timeout: 10000 }).should(
      "eq",
      "/123/cHJvZHVjdHMvZm9vMi9jb2xsZWN0aW9uLmpzb24=",
    );
    cy.visit("/123");
  });

  // Test file deletion functionality
  it("Delete a file", () => {
    cy.wait("@getFiles");
    cy.get("#session-action-menu").click();
    cy.get(".files-list")
      .eq(files.length - 1)
      .find(".v-btn .mdi-delete-outline")
      .click();
    cy.get(".v-card-actions .v-btn.bg-red").click();
    duplicateFile = false;
    cy.wait("@deleteContent");
    cy.wait("@getFiles");
    cy.get(".files-list").should("have.length", files.length);
  });

  // Test adding a new product
  it("Add new product", () => {
    let location;
    cy.get(".navbar .v-btn.action-button").click();
    cy.get(".v-list.button-list .v-list-item").eq(0).click();
    cy.get("eox-jsonform#automation-form")
      .shadow()
      .within(() => {
        cy.get(
          ".je-indented-panel .form-control input[name='root[id]']",
        ).should("exist");
        cy.get(".je-indented-panel .form-control input[name='root[id]']").then(
          ($input) => {
            location = btoa(`foo/bar/${$input.val()}.json`);
            cy.wrap(location).as("encodedPath");
          },
        );
        cy.get(".je-indented-panel .form-control input").eq(1).type("Foo", {
          delay: 100,
        });
        cy.get(".je-indented-panel .form-control input").eq(1).blur();
      });
    cy.get(".v-card-actions button.bg-primary").click();
    cy.wait("@getContent");
    cy.get("@encodedPath").then((location) => {
      cy.location("pathname", { timeout: 10000 }).should(
        "eq",
        "/123/" + location,
      );
    });
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.foo"] input').should(
          "have.value",
          "Foo",
        );
      });

    cy.wait(2000);
    cy.get("iframe#previewFrame").scrollIntoView();
    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .should("not.be.empty")
      .its("body")
      .as("body");
    cy.get("@body").should("be.visible").should("not.be.empty").then(cy.wrap);

    cy.visit("/123");
  });

  // Test adding new manual content
  it("Add new manual content", () => {
    cy.get(".navbar .v-btn.session-file-btn").click();
    cy.get(".add-file-btn").click();
    cy.get(".v-list-item").eq(0).click();
    cy.get(".current-session-btn").click();
    cy.get(".add-file-field").type("manual-file.txt", { delay: 100 });
    isManualContent = true;
    cy.get(".add-file-button").click();
    cy.location("pathname", { timeout: 10000 }).should(
      "eq",
      "/123/bWFudWFsLWZpbGUudHh0",
    );
    cy.get(".v-breadcrumbs-item--disabled div").should(
      "have.text",
      "manual-file.txt",
    );
    cy.visit("/123");
  });

  // Test file upload functionality
  it("Upload a file", () => {
    cy.wait(2000);
    cy.get(".navbar .v-btn.session-file-btn").click();
    cy.get(".files-browse-list").eq(2).click();
    cy.get(".add-file-btn").click();
    cy.get(".v-list-item").eq(1).click();
    cy.get(".current-session-btn").click();
    cy.get('input[type="file"]').selectFile("cypress/fixtures/code.js", {
      force: true,
    });
    cy.get(".create-file .v-list input").should("have.value", "code.js");
    isUploadFile = true;
    cy.get(".create-file button.bg-primary").click();
    cy.wait("@getFiles");
    cy.get(".files-list")
      .eq(files.length)
      .find(".file-title")
      .should("have.text", "eo-missions/code.js");
  });

  // Test to check if deployed preview link exists
  it("Check preview link exists", () => {
    cy.window().then((win) => {
      expect(win.gitClerkConfig).to.exist;
      cy.get("#deployed-preview-btn a").should(($btn) => {
        if (win.gitClerkConfig.deployedPreviewLink)
          expect($btn.attr("href")).to.equal(
            win.gitClerkConfig.deployedPreviewLink(pullsData),
          );
        else expect($btn).to.not.exist;
      });
    });
  });
});
