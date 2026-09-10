// Import required test fixtures and configuration
import ghConfig from "../fixtures/gh-config.json";
import user from "../fixtures/user:get.json";
import { GITHUB_HOST } from "../enums";
import sessionsList from "../fixtures/sessions-list:graphql.json";

// Open sessions come from the fixture; closed ones are collected as sessions get deleted
const openNodes = sessionsList.repository.pullRequests.nodes;
const closedNodes = [];

// Define a dummy session object for testing
const dummySession = {
  url: "https://api.github.com/repos/",
  html_url: "https://github.com/",
  node_id: "PR_foo_bar_5",
  number: 5,
  title: "Foo: Bar 5",
  draft: false,
  state: "open",
};

// State flags to control test behavior
let deleteSession = false;
let reviewSession = false;

describe("Session list related tests", () => {
  beforeEach(() => {
    // Intercept POST request for GraphQL operations
    cy.intercept(
      {
        method: "POST",
        url: `${GITHUB_HOST}/graphql`,
      },
      (req) => {
        const { query, variables } = req.body;

        // Affiliated forks lookup on startup: only the personal fork exists
        if (query.includes("forks(")) {
          req.reply({
            data: {
              repository: {
                forks: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      name: ghConfig.repo,
                      isPrivate: false,
                      viewerPermission: "ADMIN",
                      owner: { login: user.login, __typename: "User" },
                    },
                  ],
                },
              },
            },
          });
          return;
        }

        // Sessions list and open/closed counts walk repository.pullRequests
        if (query.includes("pullRequests(")) {
          const isOpen = variables.states.includes("OPEN");

          if (isOpen && deleteSession) {
            closedNodes.push({ ...openNodes.shift(), state: "CLOSED" });
            deleteSession = false;
          } else if (isOpen && reviewSession) {
            openNodes[1].isDraft = false;
            reviewSession = false;
          }

          req.reply({
            data: {
              repository: {
                pullRequests: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: isOpen ? openNodes : closedNodes,
                },
              },
            },
          });
          return;
        }

        // Everything else is the mark-ready-for-review mutation
        req.reply({
          data: {
            markPullRequestReadyForReview: {
              pullRequest: {
                title: "dummy-title",
              },
            },
          },
        });
      },
    ).as("postGraphql");
  });

  // Test that sessions list renders correctly
  it("Render sessions list", () => {
    cy.visit("/");
    cy.get(".sessions-view", { timeout: 12000 }).should(
      "have.length",
      openNodes.length,
    );
    // Wait for the open/closed counts so their requests do not leak into the next test
    cy.get(".open-session-chip").should("have.text", String(openNodes.length));
  });

  // Test that session titles match expected values
  it("Validate sessions list items with title name", () => {
    cy.get(".session-title").each((titleElement, index) => {
      cy.wrap(titleElement).should("have.text", openNodes[index].title);
    });
  });

  // Test session deletion functionality
  it("Delete a session", () => {
    deleteSession = true;
    cy.get(".sessions-view").eq(0).find(".v-btn .mdi-delete-outline").click();
    cy.get(".v-card-actions .v-btn.bg-red").click();
    // Reload walks the open list, then the closed list for the count
    cy.wait("@postGraphql")
      .its("request.body.variables.states")
      .should("deep.equal", ["OPEN"]);
    cy.wait("@postGraphql")
      .its("request.body.variables.states")
      .should("deep.equal", ["CLOSED", "MERGED"]);
    cy.get(".closed-session-chip").should("have.text", "1");
  });

  // Test session review functionality
  it("Review a session", () => {
    reviewSession = true;
    cy.get(".sessions-view")
      .eq(1)
      .find(".v-btn .mdi-file-document-edit")
      .click();
    cy.get(".v-card-actions .v-btn.bg-success", { timeout: 30000 }).click();
    // Mutation, then the open list and closed count reload
    cy.wait("@postGraphql");
    cy.wait("@postGraphql");
    cy.wait("@postGraphql");
    // Verify review indicators appear
    cy.get(".sessions-view")
      .eq(1)
      .find("svg.octicon-git-pull-request")
      .should("exist");
    cy.get(".sessions-view").eq(1).find("i.text-green").should("exist");
  });

  // Test creating a new session
  it("Create a new session", () => {
    cy.get("header .v-btn.action-button").click();
    cy.get(".session-create-field .session-name-field .v-field__input").type(
      dummySession.title,
      { delay: 100 },
    );
    cy.get(".session-create-field .v-btn.bg-primary").click();
    cy.wait("@createPulls", { requestTimeout: 10000 }).then(() => {
      cy.location("pathname", { timeout: 10000 }).should("eq", "/123");
    });
  });
});
