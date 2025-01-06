import searchIssues from "../fixtures/search-issues:get.json";
import ghConfig from "../fixtures/gh-config.json";
import user from "../fixtures/user:get.json";
import { GITHUB_HOST, E2E_URL } from "../enums";

const dummySession = {
  url: "https://api.github.com/repos/",
  html_url: "https://github.com/",
  node_id: "PR_foo_bar_5",
  number: 5,
  title: "Foo: Bar 5",
};

let deleteSession = false;

describe("Sessions Related Tests", () => {
  before(() => {
    cy.visit(E2E_URL);
  });

  beforeEach(() => {
    cy.intercept(
      `${GITHUB_HOST}/search/issues?q=repo%3A${ghConfig.username}%2F${ghConfig.repo}%20is%3Apr%20author%3A${user.login}&per_page=10&page=1`,
      (req) => {
        let tempData = searchIssues;
        if (deleteSession) {
          tempData.items[0].closed_at = true;
          tempData.items[0].state = "closed";
          deleteSession = false;
        }
        req.reply(tempData);
      },
    ).as("getSearchIssues");
  });

  it("Render sessions list", () => {
    cy.get(".sessions-view", { timeout: 12000 }).should(
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

  it("Delete a session", () => {
    deleteSession = true;
    cy.get(".sessions-view").eq(0).find(".v-btn .mdi-delete-outline").click();
    cy.get(".v-card-actions .v-btn.bg-red").click();
    cy.wait("@getSearchIssues");
    cy.get(".session-closed .main-title").should(
      "have.text",
      searchIssues.items[0].title,
    );
  });

  it("Create a new session", () => {
    cy.get(".navbar .v-btn").click();
    cy.get(".session-create-field .v-field__input").type(dummySession.title);
    // cy.get(".session-create-field .v-btn").click();
  });
});
