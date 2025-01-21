// Import required dependencies and test data
import { GITHUB_HOST_REGEX } from "../enums";
import ghConfig from "../fixtures/gh-config.json";
import files from "../fixtures/files:get.json";
import content from "../fixtures/content:get.json";

// State flags to control test behavior
let duplicateFile = false;
let isProductContent = false;
let isNarrativeContent = false;
let isManualContent = false;
let isUploadFile = false;

// Test file path constant
const fileName = "products/foo2/collection.json";

describe("Files list related tests", () => {
  // Visit the session page before all tests
  before(() => {
    cy.visit("/123");
  });

  beforeEach(() => {
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
            filename: "hello/code.js",
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
        // Modify content based on content type flags
        if (isProductContent) {
          tempContent.path = "products/foo3/collection.json";
          tempContent.content =
            "ewogICJpZCI6ICJmb28zIiwKICAidGl0bGUiOiAiRm9vIiwKICAibGlua3MiOiBbXQp9";
        }
        if (isNarrativeContent) {
          tempContent.path = "narratives/story1.md";
          tempContent.content = "IyBTdG9yeQ==";
        }
        if (isManualContent) {
          tempContent.path = "manual-file.txt";
          tempContent.content = "";
          isManualContent = false;
        }
        req.reply(tempContent);
      },
    ).as("getContent");
  });

  // Test that files list renders correctly
  it("Render files list", () => {
    cy.wait("@getFiles");
    cy.get(".files-view", { timeout: 12000 }).should(
      "have.length",
      files.length,
    );
  });

  // Test that file titles match expected values
  it("Validate files list items with title name", () => {
    cy.get(".main-title").each((fileElement, index) => {
      cy.wrap(fileElement).should("have.text", files[index].filename);
    });
  });

  // Test file duplication functionality
  it("Duplicate a file", () => {
    duplicateFile = true;
    cy.get(".files-view").eq(0).find(".v-btn .mdi-content-copy").click();
    cy.get(".files-view").eq(0).find(".v-field__input").type("products/", {
      delay: 100,
    });
    cy.get(".files-view").eq(0).find(".v-field__input").type("foo2/", {
      delay: 100,
    });
    cy.get(".files-view")
      .eq(0)
      .find(".v-field__input")
      .type("collection.json", {
        delay: 100,
      });
    cy.get(".files-view")
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
    cy.get(".files-view")
      .eq(files.length - 1)
      .find(".v-btn .mdi-delete-outline")
      .click();
    cy.get(".v-card-actions .v-btn.bg-red").click();
    duplicateFile = false;
    cy.wait("@deleteContent");
    cy.wait("@getFiles");
    cy.get(".files-view").should("have.length", files.length);
  });

  // Test adding a new product
  it("Add new product", () => {
    cy.get(".navbar .v-btn").click();
    cy.get(".v-list.button-list .v-list-item").eq(0).click();
    cy.get("eox-jsonform#automation-form")
      .shadow()
      .within(() => {
        cy.get(".je-indented-panel .form-control input").eq(0).type("foo3", {
          delay: 100,
        });
        cy.get(".je-indented-panel .form-control input").eq(1).type("Foo", {
          delay: 100,
        });
        cy.get(".je-indented-panel .form-control input").eq(1).blur();
        isProductContent = true;
      });
    cy.get(".v-card-actions button.bg-primary").click();
    cy.wait("@getContent");
    cy.location("pathname", { timeout: 10000 }).should(
      "eq",
      "/123/cHJvZHVjdHMvZm9vMy9jb2xsZWN0aW9uLmpzb24=",
    );
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.title"] input').should(
          "have.value",
          "Foo",
        );
        cy.visit("/123");
        isProductContent = false;
      });
  });

  // Test adding a new narrative
  it("Add new narrative", () => {
    cy.get(".navbar .v-btn").click();
    cy.get(".v-list.button-list .v-list-item").eq(1).click();
    cy.get("eox-jsonform#automation-form")
      .shadow()
      .within(() => {
        cy.get(".je-indented-panel .form-control input").eq(0).type("story1", {
          delay: 100,
        });
        cy.get(".je-indented-panel .form-control input").eq(1).type("Story", {
          delay: 100,
        });
        cy.get(".je-indented-panel .form-control input").eq(1).blur();
        isNarrativeContent = true;
      });
    cy.get(".v-card-actions button.bg-primary").click();
    cy.location("pathname", { timeout: 10000 }).should(
      "eq",
      "/123/bmFycmF0aXZlcy9zdG9yeTEubWQ=",
    );

    cy.wait(5000);
    cy.get("iframe#previewFrame").scrollIntoView();
    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .should("not.be.empty")
      .its("body")
      .as("body");
    cy.get("@body").should("be.visible").should("not.be.empty").then(cy.wrap);

    cy.visit("/123");
    isNarrativeContent = false;
  });

  // Test adding new manual content
  it("Add new manual content", () => {
    cy.get(".navbar .v-btn").click();
    cy.get(".v-list.button-list .v-list-item").eq(2).click();
    cy.get(".session-create-field .v-field__input").type("manual-file.txt", {
      delay: 100,
    });
    isManualContent = true;
    cy.get(".session-create-field .mdi-plus").click();
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
    cy.get(".navbar .v-btn").click();
    cy.get(".v-list.button-list .v-list-item").eq(3).click();
    cy.get(".create-file .session-create-field .v-field__input").type(
      "hello/",
      {
        delay: 100,
      },
    );
    cy.get('input[type="file"]').selectFile("cypress/fixtures/code.js", {
      force: true,
    });
    cy.get(".create-file .v-list input").should("have.value", "code.js");
    isUploadFile = true;
    cy.get(".create-file button.bg-primary").click();
    cy.wait("@getFiles");
    cy.get(".files-view")
      .eq(files.length)
      .find(".main-title")
      .should("have.text", "hello/code.js");
  });
});
