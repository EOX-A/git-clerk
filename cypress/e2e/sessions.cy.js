import searchIssues from "../fixtures/search-issues.json";

describe("Sessions Related Tests", () => {
  before(() => {
    // Visit the page only once before all tests
    cy.visit("http://localhost:3000");
  });

  it("Render sessions list", () => {
    cy.get(".sessions-view", { timeout: 8000 }).should(
      "have.length",
      searchIssues.total_count,
    );
  });

  it("Validate sessions list items with title name", () => {
    cy.get(".main-title").each((titleElement, index) => {
      cy.wrap(titleElement).should(
        "have.text",
        searchIssues.items[index].title,
      );
    });
  });
});
