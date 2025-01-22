// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";
import { GITHUB_HOST, GITHUB_HOST_REGEX } from "../enums";
import ghConfig from "../fixtures/gh-config.json";

// Set up intercepts for all API calls before each test
beforeEach(() => {
  // Intercept user info request
  cy.intercept(
    {
      method: "GET",
      url: `${GITHUB_HOST}/user`,
    },
    (req) => {
      req.reply({
        fixture: "user:get.json",
      });
    },
  ).as("getUser");

  // Intercept repository info request
  cy.intercept(
    "GET",
    new RegExp(`${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/[^/]+`),
    {
      fixture: "repo:get.json",
    },
  ).as("getRepo");

  // Intercept merge upstream request
  cy.intercept(
    "POST",
    new RegExp(
      `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/merge-upstream`,
    ),
    {
      fixture: "merge-upstream:post.json",
    },
  ).as("postMergeUpstream");

  // Intercept git ref request
  cy.intercept(
    new RegExp(
      `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/ref/heads%2Fmain`,
    ),
    { object: { sha: "dummy-tree-sha" } },
  ).as("getRef");

  // Intercept git commit request
  cy.intercept(
    new RegExp(
      `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/commits/[^/]+`,
    ),
    { tree: { sha: "dummy-sha" } },
  ).as("getCommit");

  // Intercept create ref request
  cy.intercept(
    {
      method: "POST",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/refs`,
      ),
    },
    { data: "dummy" },
  ).as("createRef");

  // Intercept create commit request
  cy.intercept(
    {
      method: "POST",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/commits`,
      ),
    },
    { sha: "dummy-sha" },
  ).as("createCommit");

  // Intercept update ref request
  cy.intercept(
    {
      method: "PATCH",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/refs/[^/]+`,
      ),
    },
    { data: "dummy" },
  ).as("updateRef");

  // Intercept create pull request
  cy.intercept(
    {
      method: "POST",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls`,
      ),
    },
    { number: 123 },
  ).as("createPulls");

  // Intercept update pull request
  cy.intercept(
    {
      method: "PATCH",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+`,
      ),
    },
    { fixture: "pulls:get.json" },
  ).as("pullsUpdate");

  // Intercept get pull request
  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+`,
      ),
    },
    { fixture: "pulls:get.json" },
  ).as("pullsUpdate");

  // Intercept pull request reviews
  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+\\/reviews`,
      ),
    },
    [],
  ).as("pullsReviews");

  // Intercept delete ref request
  cy.intercept(
    {
      method: "DELETE",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/[^/]+\\/git/refs/[^/]+`,
      ),
    },
    { data: "dummy" },
  ).as("deleteRef");

  // Intercept check runs request
  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/commits/[^/]+\\/check-runs`,
      ),
    },
    {
      total_count: 1,
      check_runs: [
        {
          status: "completed",
          conclusion: "cancelled",
        },
      ],
    },
  ).as("getCheckRuns");

  // Intercept repository contents request
  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents`,
      ),
    },
    {
      fixture: "contents:get.json",
    },
  ).as("getContents");

  // Intercept specific file content request
  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
      ),
    },
    {
      fixture: "content:get.json",
    },
  ).as("getContent");

  // Intercept update file content request
  cy.intercept(
    {
      method: "PUT",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
      ),
    },
    {},
  ).as("putContent");

  // Intercept delete file request
  cy.intercept(
    {
      method: "DELETE",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/contents/[^/]+`,
      ),
    },
    {},
  ).as("deleteContent");
});
