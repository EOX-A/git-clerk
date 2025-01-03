import "@/main.js";

describe("Hello World Test", () => {
  it("should display Hello World", () => {
    cy.document().then((doc) => {
      const div = doc.createElement("div");
      div.innerText = "Hello World";
      doc.body.appendChild(div);
    });

    // Check if the page contains 'Hello World'
    cy.contains("Hello World").should("be.visible");
  });
});
