// Import required configuration and test data
import ghConfig from "../fixtures/gh-config.json";
import { GITHUB_HOST, GITHUB_HOST_REGEX } from "../enums";
import content from "../fixtures/content:get.json";
import { checkTour } from "../helper";

describe("File related tests", () => {
  // Track content change states
  const renamedSessionTitle = "renamed-file.txt";
  let isBootstrapFileChanged = false;
  let isNormalContentChanged = false;
  let isRenameFile = false;

  beforeEach(() => {
    // Intercept GET requests for file contents
    cy.intercept(
      {
        method: "GET",
        url: new RegExp(
          `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
        ),
      },
      (req) => {
        // Return modified content based on which type of file was changed
        let tempContent = content;
        if (isBootstrapFileChanged) {
          tempContent.content =
            "ewogICJpZCI6ICI2MTFjNWQxNC03MDg3LTQ4MjAtYWNmNS02NDlhYWJjMjI0MjMiLAogICJmb28iOiAiRm9vIEJhciIsCiAgImJhciI6IHRydWUsCiAgImN1c3RvbSI6ICIiCn0=";
        }
        // If normal content was changed, set base64 encoded console.log as content
        if (isNormalContentChanged) {
          tempContent.content = "Y29uc29sZS5sb2coIkhlbGxvIFdvcmxkIik7";
        }
        if (isRenameFile) {
          tempContent.path = "renamed-file.txt";
        }
        req.reply(tempContent);
      },
    ).as("getContent");
  });

  // Test to check if the tour is rendered and close the tour
  it("Tour check and click next button", () => {
    // Visit a file with a preview
    cy.wait(1000);
    cy.visit(
      "/123/Zm9vL2Jhci82MTFjNWQxNC03MDg3LTQ4MjAtYWNmNS02NDlhYWJjMjI0MjMuanNvbg==",
    );

    // Wait for the file to load
    cy.wait("@pullsUpdate");
    cy.wait("@getContent");

    cy.wait(1000);
    checkTour();
  });

  // Test resizing/hiding/showing the preview
  it("Resize Preview", () => {
    // Check if the file is loaded
    cy.get("eox-jsonform").should("exist");

    // Resize Preview test
    cy.get(".resize-btn").click();
    cy.get(".file-preview").should("have.class", "v-col-md-12");
    cy.get(".resize-btn").click();
    cy.get(".file-preview").should("have.class", "v-col-md-6");

    // Hide/Show Preview test
    cy.get(".hide-show-preview-btn").click();
    cy.get(".file-preview").should("have.class", "d-none");
    cy.get(".hide-show-preview-btn").click();
  });

  // Test loading and editing Bootstrap File
  it("Load Bootstrap File", () => {
    // Edit the file
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.foo"] input:not(.json-editor-opt-in)')
          .clear()
          .type("Foo Bar", { delay: 100 });
        cy.get('div[data-schemapath="root.foo"] input').blur();
        isBootstrapFileChanged = true;
      });
    cy.wait(2000);

    // Check if the preview is loaded
    cy.get("iframe#previewFrame").scrollIntoView();
    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .should("not.be.empty")
      .its("body")
      .as("body");
    cy.get("@body").should("be.visible").should("not.be.empty").then(cy.wrap);
    cy.get("@body").within(() => {
      // Click on the button to open the preview
      cy.get("button").click();
      cy.get("#foo").should("have.text", "Foo Bar");
    });

    // Click on the navbar button to save the file
    cy.get(".navbar .v-btn.action-button").click();
    cy.wait("@getContent");

    // Check if the file is saved
    cy.get("eox-jsonform").should("exist");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        // Check if the file is saved
        cy.get('div[data-schemapath="root.foo"] input').should(
          "have.value",
          "Foo Bar",
        );
        cy.get('div[data-schemapath="root.bar"] input').should("be.checked");
      });
  });

  // Test loading and editing normal text/code files
  it("Load a normal file", () => {
    // Visit a normal file
    isNormalContentChanged = true;
    cy.visit("/123/Y29kZS5qcw==");
    cy.wait("@pullsUpdate");
    cy.wait("@getContent");

    // Check if the file is loaded
    cy.get("eox-jsonform").should("exist");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        // Check if the file is loaded
        cy.get(".je-indented-panel .ace_editor .ace_line").should(
          "have.text",
          `console.log("Hello World");`,
        );
      });

    // Edit the file
    const file = `const foo = "bar";console.log(foo);`;
    cy.get("eox-jsonform").then(($jsonform) => {
      const editor = $jsonform[0].editor;
      editor.setValue({
        file,
      });
    });

    // Check if the file is saved
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        // Check if the file is saved
        cy.get(".je-indented-panel .ace_editor .ace_line").should(
          "have.text",
          file,
        );
      });
  });

  // Test renaming a file
  it("Rename file", () => {
    checkTour();
    // Rename the file
    isRenameFile = true;
    cy.get("#rename-file-btn").click();
    cy.get(".rename-file-container .v-field__input")
      .clear()
      .type(renamedSessionTitle, {
        delay: 100,
      });

    // Click on the navbar button to save the file
    cy.get(".rename-file-container .v-btn.bg-primary").click();
    cy.get(".v-card-actions .v-btn.bg-success").click();
    cy.wait("@getContent");

    // Check if the file is renamed
    cy.get(".v-breadcrumbs-item--disabled div").should(
      "have.text",
      renamedSessionTitle,
    );
  });
});
