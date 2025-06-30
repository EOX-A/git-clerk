export function checkTour() {
  cy.get("body").then(($body) => {
    if ($body.find(".driver-popover", { timeout: 120000 }).length > 0) {
      cy.get(".driver-popover-close-btn").click();
    } else {
      cy.log("Tour not found");
    }
  });
}
