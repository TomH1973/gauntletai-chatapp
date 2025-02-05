/// <reference types="cypress" />

import '@testing-library/cypress/add-commands';

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      loginAsSecondUser(): Chainable<void>;
      createThread(name: string): Chainable<void>;
      sendMessage(content: string): Chainable<void>;
      replyToMessage(content: string): Chainable<void>;
      goOffline(): Chainable<void>;
      goOnline(): Chainable<void>;
    }
  }
}

// Mock Clerk authentication for testing
Cypress.Commands.add('login', () => {
  // Get test credentials from environment
  const testEmail = Cypress.env('TEST_USER_EMAIL');
  const testPassword = Cypress.env('TEST_USER_PASSWORD');

  // Intercept Clerk auth requests
  cy.intercept('POST', 'https://*.clerk.accounts.dev/v1/client/sign_ins').as('signIn');
  cy.intercept('GET', 'https://*.clerk.accounts.dev/v1/client/sessions/*').as('getSession');

  // Visit login page
  cy.visit('/sign-in');

  // Fill in credentials
  cy.get('[data-testid="email-input"]').type(testEmail);
  cy.get('[data-testid="password-input"]').type(testPassword);
  cy.get('[data-testid="submit-button"]').click();

  // Wait for auth to complete
  cy.wait('@signIn').its('response.statusCode').should('eq', 200);

  // Store session token
  cy.window().then((win) => {
    win.localStorage.setItem('__clerk_client_jwt', Cypress.env('TEST_USER_TOKEN'));
  });

  // Verify successful login
  cy.url().should('not.include', '/sign-in');
});

// Command for second test user
Cypress.Commands.add('loginAsSecondUser', () => {
  const testEmail2 = Cypress.env('TEST_USER_2_EMAIL');
  const testPassword2 = Cypress.env('TEST_USER_2_PASSWORD');

  cy.intercept('POST', 'https://*.clerk.accounts.dev/v1/client/sign_ins').as('signIn');
  cy.intercept('GET', 'https://*.clerk.accounts.dev/v1/client/sessions/*').as('getSession');

  cy.visit('/sign-in');
  cy.get('[data-testid="email-input"]').type(testEmail2);
  cy.get('[data-testid="password-input"]').type(testPassword2);
  cy.get('[data-testid="submit-button"]').click();

  cy.wait('@signIn').its('response.statusCode').should('eq', 200);

  cy.window().then((win) => {
    win.localStorage.setItem('__clerk_client_jwt', Cypress.env('TEST_USER_2_TOKEN'));
  });

  cy.url().should('not.include', '/sign-in');
});

// Create a new thread
Cypress.Commands.add('createThread', (name: string) => {
  cy.get('[data-testid="new-thread-button"]').click();
  cy.get('[data-testid="thread-name-input"]').type(name);
  cy.get('[data-testid="create-thread-submit"]').click();
  cy.get('[data-testid="thread-title"]').should('contain', name);
});

// Send a message in the current thread
Cypress.Commands.add('sendMessage', (content: string) => {
  cy.get('[data-testid="message-input"]')
    .type(content + '{enter}');
  cy.get('[data-testid="message-list"]')
    .should('contain', content);
});

// Reply to the first message in the thread
Cypress.Commands.add('replyToMessage', (content: string) => {
  cy.get('[data-testid="message"]').first()
    .find('[data-testid="reply-button"]')
    .click();
  cy.get('[data-testid="reply-input"]')
    .type(content + '{enter}');
  cy.get('[data-testid="message-replies"]')
    .should('contain', content);
});

// Simulate going offline
Cypress.Commands.add('goOffline', () => {
  cy.window().then((win) => {
    win.dispatchEvent(new Event('offline'));
  });
});

// Simulate going online
Cypress.Commands.add('goOnline', () => {
  cy.window().then((win) => {
    win.dispatchEvent(new Event('online'));
  });
}); 