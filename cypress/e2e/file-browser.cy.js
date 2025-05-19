import contents from "../fixtures/contents:get.json";
import content from "../fixtures/content:get.json";
import ghConfig from "../fixtures/gh-config.json";
import files from "../fixtures/files:get.json";
import { GITHUB_HOST_REGEX } from "../enums";

const dummySession = {
  url: "https://api.github.com/repos/",
  html_url: "https://github.com/",
  node_id: "PR_foo_bar_5",
  number: 5,
  title: "Foo: Bar 5",
  draft: false,
  state: "open",
};

const dummyFile = {
  filename: "code.js",
  status: "added",
  additions: 34,
  deletions: 0,
  changes: 34,
};

let editSession = false;
let isUploadFile = false;

describe("File browser related tests", () => {
  beforeEach(() => {
    // Intercept the GET request to get the content of the file
    cy.intercept(
      {
        method: "GET",
        url: new RegExp(
          `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
        ),
      },
      (req) => {
        req.reply({
          ...content,
          content: editSession ? "ewogIGR1bW15OiAiZHVtbXkiCn0=" : "IA==",
          name: "catalog.json",
          path: "catalog.json",
        });
      },
    ).as("getContent");

    // Intercept the GET request to get the files list
    cy.intercept(
      {
        method: "GET",
        url: new RegExp(
          `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+/files`,
        ),
      },
      (req) => {
        let tempData = files;
        // Add uploaded file if flag is set
        if (isUploadFile) {
          tempData.push(dummyFile);
          isUploadFile = false;
        }

        req.reply(tempData);
      },
    ).as("getFiles");
  });

  // Test to check if the files list is rendered correctly
  it("Render files list", () => {
    cy.visit("/");
    cy.get(".files-view", { timeout: 12000 }).should(
      "have.length",
      contents.length,
    );
  });

  // Test to check if the new file is added correctly
  it("Add new file", () => {
    cy.get(".add-file-btn").click();
    cy.get(".v-list-item").eq(0).click();
    cy.get(".session-create-field .v-field__input").type(dummySession.title, {
      delay: 100,
    });
    cy.get(".session-create-btn").click();
    cy.wait("@createPulls");
    cy.get(".add-file-field").type("newFile.txt", { delay: 100 });
    cy.get(".add-file-button").click();
    cy.wait("@getContent", { requestTimeout: 10000 }).then(() => {
      cy.location("pathname", { timeout: 10000 }).should(
        "eq",
        "/123/bmV3RmlsZS50eHQ=",
      );
    });
  });

  // Test to check if the existing file is edited correctly
  it("Edit existing file", () => {
    editSession = true;
    cy.get(".navbar .v-btn.session-file-btn").click();
    cy.get(".files-view").eq(6).click();
    cy.get(".current-session-btn").click();
    cy.location("pathname", { timeout: 10000 }).should(
      "eq",
      "/123/Y2F0YWxvZy5qc29u",
    );
    cy.visit("/123");
  });

  // Test to check if the file is uploaded correctly
  it("Upload file", () => {
    cy.get(".navbar .v-btn.session-file-btn").click();
    cy.get(".add-file-btn").click();
    cy.get(".v-list-item").eq(1).click();
    cy.get(".current-session-btn").click();
    cy.get('input[type="file"]').selectFile("cypress/fixtures/code.js", {
      force: true,
    });
    cy.get(".v-list input").should("have.value", dummyFile.filename);
    isUploadFile = true;
    cy.get(".upload-file-btn").click();
    cy.wait("@getFiles");
    cy.get(".files-list")
      .eq(files.length)
      .find(".file-title")
      .should("have.text", dummyFile.filename);
  });
});
