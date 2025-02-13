// Import required configuration and test data
import ghConfig from "../fixtures/gh-config.json";
import { GITHUB_HOST, GITHUB_HOST_REGEX } from "../enums";
import content from "../fixtures/content:get.json";

describe("File related tests", () => {
  // Track content change states
  let isBootstrapFileChanged = false;
  let isNormalContentChanged = false;

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
        req.reply(tempContent);
      },
    ).as("getContent");
  });

  // Test loading and editing Bootstrap File
  it("Load Bootstrap File", () => {
    cy.wait(1000);
    cy.visit(
      "/123/Zm9vL2Jhci82MTFjNWQxNC03MDg3LTQ4MjAtYWNmNS02NDlhYWJjMjI0MjMuanNvbg==",
    );
    cy.wait("@pullsUpdate");
    cy.wait("@getContent");
    cy.get("eox-jsonform").should("exist");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.foo"] input')
          .clear()
          .type("Foo Bar", { delay: 100 });
        cy.get('div[data-schemapath="root.foo"] input').blur();
        isBootstrapFileChanged = true;
      });
    cy.wait(2000);
    cy.get("iframe#previewFrame").scrollIntoView();
    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .should("not.be.empty")
      .its("body")
      .as("body");
    cy.get("@body").should("be.visible").should("not.be.empty").then(cy.wrap);
    cy.get("@body").within(() => {
      cy.get("button").click();
      cy.get("#foo").should("have.text", "Foo Bar");
    });
    cy.get(".navbar .v-btn").click();
    cy.wait("@getContent");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.foo"] input').should(
          "have.value",
          "Foo Bar",
        );
        cy.get('div[data-schemapath="root.bar"] input').should("be.checked");
      });
  });

  // Test loading and editing normal text/code files
  it("Load a normal file", () => {
    isNormalContentChanged = true;
    cy.visit("/123/Y29kZS5qcw==");
    cy.wait("@pullsUpdate");
    cy.wait("@getContent");
    cy.get("eox-jsonform").should("exist");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get(".je-indented-panel textarea").should(
          "have.value",
          `console.log("Hello World");`,
        );
      });

    const file = `const foo = "bar";console.log(foo);`;
    cy.get("eox-jsonform").then(($jsonform) => {
      const editor = $jsonform[0].editor;
      editor.setValue({
        file,
      });
    });

    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get(".je-indented-panel textarea").should("have.value", file);
      });
  });
});
