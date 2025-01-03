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
import ghConfig from "../fixtures/gh-config.json";
import user from "../fixtures/user.json";
const GITHUB_HOST = "https://api.github.com";

beforeEach(() => {
  cy.intercept("GET", `${GITHUB_HOST}/user`, {
    fixture: "user.json",
  }).as("getUser");

  cy.intercept(
    "GET",
    `${GITHUB_HOST}/search/issues?q=repo%3A${ghConfig.username}%2F${ghConfig.repo}%20is%3Apr%20author%3A${user.login}&per_page=10&page=1`,
    {
      fixture: "search-issues.json",
    },
  ).as("getSearchIssues");
});
