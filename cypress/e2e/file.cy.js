// Import required configuration and test data
import ghConfig from "../fixtures/gh-config.json";
import { GITHUB_HOST, GITHUB_HOST_REGEX } from "../enums";
import content from "../fixtures/content:get.json";

describe("File related tests", () => {
  // Track content change states
  let isProductContentChanged = false;
  let isNarrativeContentChanged = false;
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
        if (isProductContentChanged) {
          tempContent.content =
            "ewogICJ0eXBlIjogIkNvbGxlY3Rpb24iLAogICJpZCI6ICJhZXJvc29sLWR1c3Qtb2QtbGl2YXMiLAogICJzdGFjX3ZlcnNpb24iOiAiMS4wLjAiLAogICJkZXNjcmlwdGlvbiI6ICJUaGlzIGlzIGEgdGVzdCBkZXNjcmlwdGlvbiIsCiAgImxpbmtzIjogWwogICAgewogICAgICAicmVsIjogInJvb3QiLAogICAgICAiaHJlZiI6ICIuLi8uLi9jYXRhbG9nLmpzb24iLAogICAgICAidHlwZSI6ICJhcHBsaWNhdGlvbi9qc29uIiwKICAgICAgInRpdGxlIjogIk9wZW4gU2NpZW5jZSBDYXRhbG9nIgogICAgfSwKICAgIHsKICAgICAgInJlbCI6ICJ2aWEiLAogICAgICAiaHJlZiI6ICJmdHBzOi8vbGl2YXM6bGl2YXMtcHVibGljQHJlYWN0LnNwYWNlLm5vYS5nciIsCiAgICAgICJ0aXRsZSI6ICJBY2Nlc3MiCiAgICB9LAogICAgewogICAgICAicmVsIjogInZpYSIsCiAgICAgICJocmVmIjogImh0dHA6Ly8xOTUuMjUxLjIwMy4yMzgvYmV5b25kL2ltYWdlcy9kb2NzL3B1YmxpY2F0aW9ucy9hdG1vc3BoZXJpYy9BbWlyaWRpc19MSVZBUy5wZGYiLAogICAgICAidGl0bGUiOiAiRG9jdW1lbnRhdGlvbiIKICAgIH0sCiAgICB7CiAgICAgICJyZWwiOiAicGFyZW50IiwKICAgICAgImhyZWYiOiAiLi4vY2F0YWxvZy5qc29uIiwKICAgICAgInR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIsCiAgICAgICJ0aXRsZSI6ICJQcm9kdWN0cyIKICAgIH0sCiAgICB7CiAgICAgICJyZWwiOiAicmVsYXRlZCIsCiAgICAgICJocmVmIjogIi4uLy4uL3Byb2plY3RzL2xpZGFyLWNsaW1hdG9sb2d5LW9mLXZlcnRpY2FsLWFlcm9zb2wtc3RydWN0dXJlLWZvci1zcGFjZS1iYXNlZC1saWRhci1zaW11bGF0aW9uLXN0dWRpZXMtbGl2YXMvY29sbGVjdGlvbi5qc29uIiwKICAgICAgInR5cGUiOiAiYXBwbGljYXRpb24vanNvbiIsCiAgICAgICJ0aXRsZSI6ICJQcm9qZWN0OiBMSVZBUyIKICAgIH0sCiAgICB7CiAgICAgICJyZWwiOiAicmVsYXRlZCIsCiAgICAgICJocmVmIjogIi4uLy4uL3RoZW1lcy9hdG1vc3BoZXJlL2NhdGFsb2cuanNvbiIsCiAgICAgICJ0eXBlIjogImFwcGxpY2F0aW9uL2pzb24iLAogICAgICAidGl0bGUiOiAiVGhlbWU6IEF0bW9zcGhlcmUiCiAgICB9LAogICAgewogICAgICAicmVsIjogInJlbGF0ZWQiLAogICAgICAiaHJlZiI6ICIuLi8uLi92YXJpYWJsZXMvYWVyb3NvbC1vcHRpY2FsLWRlcHRoLXRoaWNrbmVzcy9jYXRhbG9nLmpzb24iLAogICAgICAidHlwZSI6ICJhcHBsaWNhdGlvbi9qc29uIiwKICAgICAgInRpdGxlIjogIlZhcmlhYmxlOiBBZXJvc29sIE9wdGljYWwgRGVwdGgvVGhpY2tuZXNzIgogICAgfSwKICAgIHsKICAgICAgInJlbCI6ICJyZWxhdGVkIiwKICAgICAgImhyZWYiOiAiLi4vLi4vZW8tbWlzc2lvbnMvY2FsaXBzby9jYXRhbG9nLmpzb24iLAogICAgICAidHlwZSI6ICJhcHBsaWNhdGlvbi9qc29uIiwKICAgICAgInRpdGxlIjogIkVPIE1pc3Npb246IENBTElQU08iCiAgICB9LAogICAgewogICAgICAicmVsIjogInNlbGYiLAogICAgICAiaHJlZiI6ICJodHRwczovL2VzYS1lYXJ0aGNvZGUuZ2l0aHViLmlvL29wZW4tc2NpZW5jZS1jYXRhbG9nLW1ldGFkYXRhL3Byb2R1Y3RzL2Flcm9zb2wtZHVzdC1vZC1saXZhcy9jb2xsZWN0aW9uLmpzb24iLAogICAgICAidHlwZSI6ICJhcHBsaWNhdGlvbi9qc29uIgogICAgfQogIF0sCiAgInN0YWNfZXh0ZW5zaW9ucyI6IFsKICAgICJodHRwczovL3N0YWMtZXh0ZW5zaW9ucy5naXRodWIuaW8vb3NjL3YxLjAuMC1yYy4zL3NjaGVtYS5qc29uIiwKICAgICJodHRwczovL3N0YWMtZXh0ZW5zaW9ucy5naXRodWIuaW8vY2YvdjAuMi4wL3NjaGVtYS5qc29uIgogIF0sCiAgIm9zYzpwcm9qZWN0IjogImxpZGFyLWNsaW1hdG9sb2d5LW9mLXZlcnRpY2FsLWFlcm9zb2wtc3RydWN0dXJlLWZvci1zcGFjZS1iYXNlZC1saWRhci1zaW11bGF0aW9uLXN0dWRpZXMtbGl2YXMiLAogICJvc2M6c3RhdHVzIjogIm9uZ29pbmciLAogICJvc2M6cmVnaW9uIjogIkdsb2JhbCIsCiAgIm9zYzp0eXBlIjogInByb2R1Y3QiLAogICJjcmVhdGVkIjogIjIwMjEtMDEtMDFUMDA6MDA6MDBaIiwKICAic3RhcnRfZGF0ZXRpbWUiOiAiMjAwNi0wMS0wMVQwMDowMDowMFoiLAogICJlbmRfZGF0ZXRpbWUiOiAiMjAyMS0xMi0zMVQyMzo1OTo1OVoiLAogICJjZjpwYXJhbWV0ZXIiOiBbCiAgICB7CiAgICAgICJuYW1lIjogImF0bW9zcGhlcmVfb3B0aWNhbF90aGlja25lc3NfZHVlX3RvX2R1c3RfZHJ5X2Flcm9zb2wiCiAgICB9CiAgXSwKICAib3NjOnRoZW1lcyI6IFsKICAgICJhdG1vc3BoZXJlIgogIF0sCiAgIm9zYzp2YXJpYWJsZXMiOiBbCiAgICAiYWVyb3NvbC1vcHRpY2FsLWRlcHRoLXRoaWNrbmVzcyIKICBdLAogICJvc2M6bWlzc2lvbnMiOiBbCiAgICAiY2FsaXBzbyIKICBdLAogICJ1cGRhdGVkIjogIjIwMjQtMDktMTJUMjA6MzI6MDYuMjA5MTA4WiIsCiAgInRpdGxlIjogIkFlcm9zb2wgKGFuZCBkdXN0IGFlcm9zb2wpIG9wdGljYWwgZGVwdGhfR2xvYmFsX0NBTElQU08iLAogICJleHRlbnQiOiB7CiAgICAic3BhdGlhbCI6IHsKICAgICAgImJib3giOiBbCiAgICAgICAgWwogICAgICAgICAgLTE4MC4wLAogICAgICAgICAgLTkwLjAsCiAgICAgICAgICAxODAuMCwKICAgICAgICAgIDkwLjAKICAgICAgICBdCiAgICAgIF0KICAgIH0sCiAgICAidGVtcG9yYWwiOiB7CiAgICAgICJpbnRlcnZhbCI6IFsKICAgICAgICBbCiAgICAgICAgICAiMjAwNi0wMS0wMVQwMDowMDowMFoiLAogICAgICAgICAgIjIwMjEtMTItMzFUMjM6NTk6NTlaIgogICAgICAgIF0KICAgICAgXQogICAgfQogIH0sCiAgImxpY2Vuc2UiOiAicHJvcHJpZXRhcnkiLAogICJrZXl3b3JkcyI6IFsKICAgICJBZXJvc29scyIsCiAgICAiQWVyb3NvbCBPcHRpY2FsIERlcHRoL1RoaWNrbmVzcyIKICBdCn0=";
        }
        // If narrative content was changed, set base64 encoded "# Story" as content
        if (isNarrativeContentChanged) {
          tempContent.content = "IyBTdG9yeQ==";
        }
        // If normal content was changed, set base64 encoded console.log as content
        if (isNormalContentChanged) {
          tempContent.content = "Y29uc29sZS5sb2coIkhlbGxvIFdvcmxkIik7";
        }
        req.reply(tempContent);
      },
    ).as("getContent");
  });

  // Test loading and editing OSC (Open Science Catalog) related files
  it("Load OSC related files", () => {
    cy.wait(1000);
    cy.visit("/123/cHJvZHVjdHMvZm9vL2NvbGxlY3Rpb24uanNvbg==");
    cy.wait("@pullsUpdate");
    cy.wait("@getContent");
    cy.get("eox-jsonform").should("exist");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.title"] input')
          .clear()
          .type("Foo Bar", { delay: 100 });
        cy.get('div[data-schemapath="root.title"] input').blur();
        isProductContentChanged = true;
      });
    cy.get("eox-jsonform").then(($jsonform) => {
      let value = $jsonform[0].editor.getValue();
      value.description = "This is a test description";
      $jsonform[0].editor.setValue(value);
    });
    cy.get(".navbar .v-btn").click();
    cy.wait("@getContent");
    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get('div[data-schemapath="root.title"] input').should(
          "have.value",
          "Foo Bar",
        );
        cy.get(
          'div[data-schemapath="root.description"] .CodeMirror-line span',
        ).should("have.text", "This is a test description");
      });
  });

  // Test loading and editing narrative markdown files
  it("Load a narrative file", () => {
    isNarrativeContentChanged = true;
    cy.visit("/123/bmFycmF0aXZlcy9zdG9yeTEubWQ=");
    cy.wait("@pullsUpdate");
    cy.wait("@getContent");

    cy.wait(5000);
    cy.get("iframe#previewFrame").scrollIntoView();
    cy.get("iframe#previewFrame")
      .its("0.contentDocument")
      .should("not.be.empty")
      .its("body")
      .as("body");
    cy.get("@body").should("be.visible").should("not.be.empty").then(cy.wrap);

    cy.get("eox-jsonform").then(($jsonform) => {
      const editor = $jsonform[0].editor;
      editor.setValue({
        Story: "## Hello World",
      });
    });

    cy.get("eox-jsonform")
      .shadow()
      .within(() => {
        cy.get("pre.CodeMirror-line span")
          .eq(2)
          .should("have.text", "Hello World");
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
