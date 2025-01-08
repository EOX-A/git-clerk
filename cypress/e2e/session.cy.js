const { E2E_URL } = require("../enums");
const files = require("../fixtures/files:get.json");

describe("Individual session related tests", () => {
  before(() => {
    cy.visit(E2E_URL + "/123");
  });

  it("Render files list", () => {
    cy.get(".files-view", { timeout: 12000 }).should(
      "have.length",
      files.length,
    );
    cy.get(".main-title").each((fileElement, index) => {
      cy.wrap(fileElement).should("have.text", files[index].filename);
    });
  });
});
