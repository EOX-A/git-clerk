// Import required test fixtures and configuration
import ghConfig from "../fixtures/gh-config.json";
import user from "../fixtures/user:get.json";
import { GITHUB_HOST } from "../enums";
import sessionsList from "../fixtures/sessions-list:graphql.json";

// Open sessions come from the fixture; closed ones are collected as sessions get deleted
const openNodes = sessionsList.repository.pullRequests.nodes;
const closedNodes = [];

const orgLogin = "testroles";
const orgNodes = [
  {
    id: "PR_org_1",
    title: "Org: Bar 1",
    url: "https://github.com/octocat/Hello-World/pull/11",
    state: "OPEN",
    number: 11,
    changedFiles: 2,
    createdAt: "2025-01-10T06:07:57Z",
    updatedAt: "2025-01-10T06:07:57Z",
    isDraft: true,
    author: { login: user.login },
    headRepositoryOwner: { login: orgLogin },
  },
  {
    id: "PR_org_2",
    title: "Org: Bar 2",
    url: "https://github.com/octocat/Hello-World/pull/12",
    state: "OPEN",
    number: 12,
    changedFiles: 1,
    createdAt: "2025-01-09T06:07:57Z",
    updatedAt: "2025-01-09T06:07:57Z",
    isDraft: true,
    author: { login: "colleague" },
    headRepositoryOwner: { login: orgLogin },
  },
];

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
let orgFork = false;

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

        // Affiliated forks lookup on startup: the personal fork always exists,
        // the organisation fork only when the orgFork flag is set
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
                    ...(orgFork
                      ? [
                          {
                            name: ghConfig.repo,
                            isPrivate: false,
                            viewerPermission: "WRITE",
                            owner: {
                              login: orgLogin,
                              __typename: "Organization",
                            },
                          },
                        ]
                      : []),
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
                  nodes: isOpen ? [...openNodes, ...orgNodes] : closedNodes,
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

  // Test role based scopes: All Repos, organisation and Personal with their counts, org tags and authors
  it("List sessions per scope with org tags and authors", () => {
    // Reload with the organisation fork present: the default scope becomes "All Repos"
    orgFork = true;
    cy.visit("/");
    cy.get(".sessions-scope-btn", { timeout: 12000 }).should(
      "contain.text",
      "All Repos",
    );
    cy.get(".sessions-view").should(
      "have.length",
      openNodes.length + orgNodes.length,
    );
    cy.get(".open-session-chip").should(
      "have.text",
      String(openNodes.length + orgNodes.length),
    );

    // Personal sessions
    cy.get(".session-origin-chip").should("have.length", orgNodes.length);
    cy.get(".session-origin-chip").each((chip) => {
      cy.wrap(chip).should("contain.text", `Org: ${orgLogin}`);
    });

    // Author is shown per row: "You" for the current user, the login otherwise
    cy.get(".sessions-view")
      .eq(openNodes.length)
      .should("contain.text", "by @You");
    cy.get(".sessions-view")
      .eq(openNodes.length + 1)
      .should("contain.text", `by @${orgNodes[1].author.login}`);

    // Organisation scope lists
    cy.get(".sessions-scope-btn").click();
    cy.get(`.sessions-scope-list .scope-${orgLogin}`).click();
    cy.get(".sessions-scope-btn").should("contain.text", orgLogin);
    cy.get(".sessions-view").should("have.length", orgNodes.length);
    cy.get(".open-session-chip").should("have.text", String(orgNodes.length));
    cy.get(".session-title").each((titleElement, index) => {
      cy.wrap(titleElement).should("have.text", orgNodes[index].title);
    });

    // Personal scope lists
    cy.get(".sessions-scope-btn").click();
    cy.get(`.sessions-scope-list .scope-${user.login}`).click();
    cy.get(".sessions-scope-btn").should("contain.text", "Personal");
    cy.get(".sessions-view").should("have.length", openNodes.length);
    cy.get(".open-session-chip").should("have.text", String(openNodes.length));
    cy.get(".session-origin-chip").should("not.exist");

    cy.then(() => {
      orgFork = false;
    });
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
