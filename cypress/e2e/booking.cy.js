// cypress/e2e/booking.cy.js

describe("Booking Flow", () => {
  beforeEach(() => {
    // Visit the check-in page with kiosk mode enabled for Žilina branch
    cy.visit(
      "https://nechty.uimagic.io/checkin?pobocka=%C5%BEilina&kiosk=true"
    );
    cy.wait(1000); // Wait for page load
  });

  it("completes walk-in booking flow", () => {
    // Click "Nemám rezerváciu"
    cy.contains("Nemám rezerváciu").click();
    cy.wait(500);

    // Click "Chcem isť hneď"
    cy.contains("Chcem ísť hneď").click();
    cy.wait(500);

    // Select Manikura service
    cy.contains("Manikúra").click();
    cy.wait(500);

    // Generate random user data
    const randomName = `Test User ${Math.floor(Math.random() * 10000)}`;
    const randomEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
    const randomPhone = `+421${Math.floor(Math.random() * 1000000000)}`;

    // Fill in the form
    cy.get('input[placeholder*="meno"]').type(randomName);
    cy.get('input[type="email"]').type(randomEmail);
    cy.get('input[type="tel"]').type(randomPhone);

    // Submit the form
    cy.contains("button", "Rezervovať").click();

    // Verify success - can be adjusted based on your success message
    cy.contains("Vaša žiadosť bola prijatá", { timeout: 10000 }).should(
      "be.visible"
    );
  });
});

// cypress/support/e2e.js
// Add this to your support file if you want to ignore uncaught exceptions
Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});
