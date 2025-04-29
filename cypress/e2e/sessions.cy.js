// Import required test fixtures and configuration
import searchIssues from "../fixtures/search-issues:get.json";
import ghConfig from "../fixtures/gh-config.json";
import user from "../fixtures/user:get.json";
import { GITHUB_HOST } from "../enums";
import sessionsList from "../fixtures/sessions-list:graphql.json";
import openCount from "../fixtures/open-count:graphql.json";
import closeCount from "../fixtures/closed-count:graphql.json";

const mockQuery = {
  issueCount: `
      query($queryString: String!) {
        search(query: $queryString, type: ISSUE, first: 1, after: null) {
    			issueCount
        }
      }
    `,
  closed: `repo:${ghConfig.username}/${ghConfig.repo} is:pr author:${user.login} state:closed`,
  open: `repo:${ghConfig.username}/${ghConfig.repo} is:pr author:${user.login} state:open`,
  sessionList: `
      query($queryString: String!, $perPage: Int!, $after: String, $before: String) {
        search(query: $queryString, type: ISSUE, last: $perPage, before: $before, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
            hasPreviousPage
            startCursor
          }
    			issueCount
          nodes {
            ... on PullRequest {
              id
              title
              url
              state
              number
              changedFiles
              createdAt
              updatedAt
              isDraft
              author {
                login
              }
            }
          }
        }
      }
    `,
};

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
    // Intercept GET request for searching issues/PRs
    cy.intercept(
      {
        method: "GET",
        url: `${GITHUB_HOST}/search/issues?q=repo%3A${ghConfig.username}%2F${ghConfig.repo}%20is%3Apr%20author%3A${user.login}&per_page=10&page=1`,
      },
      (req) => {
        let tempData = searchIssues;
        // Update session state based on flags
        if (deleteSession) {
          tempData.items[0].closed_at = true;
          tempData.items[0].state = "closed";
          deleteSession = false;
        } else if (reviewSession) {
          tempData.items[1].draft = false;
          reviewSession = false;
        }
        req.reply(tempData);
      },
    ).as("getSearchIssues");

    // Intercept POST request for GraphQL operations
    cy.intercept(
      {
        method: "POST",
        url: `${GITHUB_HOST}/graphql`,
      },
      (req) => {
        const handleSessionList = () => {
          let tempData = sessionsList;
          if (deleteSession) {
            tempData.search.nodes.shift();
          } else if (reviewSession) {
            tempData.search.nodes[1].isDraft = false;
            reviewSession = false;
          }
          return { data: tempData };
        };

        const handleOpenIssueCount = () => {
          let tempData = openCount;
          if (deleteSession) {
            tempData.search.issueCount = 3;
          }
          return { data: tempData };
        };

        const handleClosedIssueCount = () => {
          let tempData = closeCount;
          if (deleteSession) {
            tempData.search.issueCount = 1;
            deleteSession = false;
          }
          return { data: tempData };
        };

        const defaultResponse = {
          data: {
            markPullRequestReadyForReview: {
              pullRequest: {
                title: "dummy-title",
              },
            },
          },
        };

        const response =
          req.body.query === mockQuery.sessionList &&
          req.body.variables.queryString === mockQuery.open
            ? handleSessionList()
            : req.body.query === mockQuery.issueCount &&
                req.body.variables.queryString === mockQuery.open
              ? handleOpenIssueCount()
              : req.body.query === mockQuery.issueCount &&
                  req.body.variables.queryString === mockQuery.closed
                ? handleClosedIssueCount()
                : defaultResponse;

        req.reply(response);
      },
    ).as("postGraphql");
  });

  // Test that sessions list renders correctly
  it("Render sessions list", () => {
    cy.visit("/");
    cy.get(".sessions-view", { timeout: 12000 }).should(
      "have.length",
      sessionsList.search.issueCount,
    );
  });

  // Test that session titles match expected values
  it("Validate sessions list items with title name", () => {
    cy.get(".main-title").each((titleElement, index) => {
      cy.wrap(titleElement).should(
        "have.text",
        sessionsList.search.nodes[index].title,
      );
    });
  });

  // Test session deletion functionality
  it("Delete a session", () => {
    deleteSession = true;
    cy.get(".sessions-view").eq(0).find(".v-btn .mdi-delete-outline").click();
    cy.get(".v-card-actions .v-btn.bg-red").click();
    cy.wait("@postGraphql");
    cy.wait("@postGraphql");
    cy.wait("@postGraphql");
    cy.get(".closed-session-chip").should(
      "have.text",
      closeCount.search.issueCount + 1,
    );
  });

  // Test session review functionality
  it("Review a session", () => {
    reviewSession = true;
    cy.get(".sessions-view")
      .eq(1)
      .find(".v-btn .mdi-file-document-edit")
      .click();
    cy.get(".v-card-actions .v-btn.bg-success", { timeout: 30000 }).click();
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
    cy.get("header .v-btn").click();
    cy.get(".session-create-field .v-field__input").type(dummySession.title, {
      delay: 100,
    });
    cy.get(".session-create-field .v-btn.bg-primary").click();
    cy.wait("@createPulls", { requestTimeout: 10000 }).then(() => {
      cy.location("pathname", { timeout: 10000 }).should("eq", "/123");
    });
  });
});
