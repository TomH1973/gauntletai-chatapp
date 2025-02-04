/// <reference types="cypress" />

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

// Login as primary test user
Cypress.Commands.add('login', () => {
  cy.session('primary-user', () => {
    cy.visit('/auth/signin');
    cy.get('[data-testid="email-input"]').type(Cypress.env('TEST_USER_EMAIL'));
    cy.get('[data-testid="password-input"]').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('not.include', '/auth/signin');
  });
});

// Login as secondary test user
Cypress.Commands.add('loginAsSecondUser', () => {
  cy.session('secondary-user', () => {
    cy.visit('/auth/signin');
    cy.get('[data-testid="email-input"]').type(Cypress.env('TEST_USER2_EMAIL'));
    cy.get('[data-testid="password-input"]').type(Cypress.env('TEST_USER2_PASSWORD'));
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('not.include', '/auth/signin');
  });
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