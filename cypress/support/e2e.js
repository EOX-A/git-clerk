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

beforeEach(() => {
  cy.intercept("GET", `${GITHUB_HOST}/user`, {
    fixture: "user:get.json",
  }).as("getUser");

  cy.intercept(
    "GET",
    new RegExp(`${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/[^/]+`),
    {
      fixture: "repo:get.json",
    },
  ).as("getRepo");

  cy.intercept(
    "POST",
    new RegExp(
      `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/merge-upstream`,
    ),
    {
      fixture: "merge-upstream:post.json",
    },
  ).as("postMergeUpstream");

  cy.intercept(
    new RegExp(
      `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/ref/heads%2Fmain`,
    ),
    { object: { sha: "dummy-tree-sha" } },
  ).as("getRef");

  cy.intercept(
    new RegExp(
      `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/commits/[^/]+`,
    ),
    { tree: { sha: "dummy-sha" } },
  ).as("getCommit");

  cy.intercept(
    {
      method: "POST",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/refs`,
      ),
    },
    { data: "dummy" },
  ).as("createRef");

  cy.intercept(
    {
      method: "POST",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/commits`,
      ),
    },
    { sha: "dummy-sha" },
  ).as("createCommit");

  cy.intercept(
    {
      method: "PATCH",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/git/refs/[^/]+`,
      ),
    },
    { data: "dummy" },
  ).as("updateRef");

  cy.intercept(
    {
      method: "POST",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls`,
      ),
    },
    { number: 123 },
  ).as("createPulls");

  cy.intercept(
    {
      method: "PATCH",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+`,
      ),
    },
    { fixture: "pulls:get.json" },
  ).as("pullsUpdate");

  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+`,
      ),
    },
    { fixture: "pulls:get.json" },
  ).as("pullsUpdate");

  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+\\/reviews`,
      ),
    },
    [],
  ).as("pullsReviews");

  cy.intercept(
    {
      method: "DELETE",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/[^/]+\\/git/refs/[^/]+`,
      ),
    },
    { data: "dummy" },
  ).as("deleteRef");

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

  cy.intercept(
    {
      method: "GET",
      url: new RegExp(
        `${GITHUB_HOST_REGEX}\\/repos\\/[^/]+\\/${ghConfig.repo}/pulls/[^/]+/files`,
      ),
    },
    {
      fixture: "files:get.json",
    },
  ).as("getFiles");
});
