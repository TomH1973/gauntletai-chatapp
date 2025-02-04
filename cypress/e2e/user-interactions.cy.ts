describe('User Interactions', () => {
  describe('Authentication Flows', () => {
    it('should handle login and logout', () => {
      // Start from login page
      cy.visit('/auth/signin');

      // Attempt login
      cy.get('[data-testid="email-input"]').type(Cypress.env('TEST_USER_EMAIL'));
      cy.get('[data-testid="password-input"]').type(Cypress.env('TEST_USER_PASSWORD'));
      cy.get('[data-testid="submit-button"]').click();

      // Verify successful login
      cy.url().should('not.include', '/auth/signin');
      cy.get('[data-testid="user-menu"]').should('exist');

      // Logout
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Verify logout
      cy.url().should('include', '/auth/signin');
    });

    it('should handle invalid login attempts', () => {
      cy.visit('/auth/signin');

      // Try invalid password
      cy.get('[data-testid="email-input"]').type(Cypress.env('TEST_USER_EMAIL'));
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="submit-button"]').click();

      // Verify error message
      cy.get('[data-testid="auth-error"]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');
    });
  });

  describe('Thread Management', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/');
    });

    it('should create and manage threads', () => {
      // Create new thread
      const threadName = 'Test Thread ' + Date.now();
      cy.get('[data-testid="new-thread-button"]').click();
      cy.get('[data-testid="thread-name-input"]').type(threadName);
      cy.get('[data-testid="thread-participants-input"]').type('test2@example.com{enter}');
      cy.get('[data-testid="create-thread-submit"]').click();

      // Verify thread creation
      cy.get('[data-testid="thread-list"]')
        .should('contain', threadName);

      // Update thread settings
      cy.get(`[data-testid="thread-${threadName}"]`).click();
      cy.get('[data-testid="thread-settings-button"]').click();
      cy.get('[data-testid="thread-name-edit"]').clear().type(threadName + ' Updated{enter}');

      // Verify update
      cy.get('[data-testid="thread-title"]')
        .should('contain', threadName + ' Updated');
    });

    it('should manage thread participants', () => {
      // Create thread first
      cy.createThread('Participant Test Thread');

      // Add participant
      cy.get('[data-testid="thread-settings-button"]').click();
      cy.get('[data-testid="add-participant-button"]').click();
      cy.get('[data-testid="participant-email-input"]').type('test3@example.com{enter}');

      // Verify participant added
      cy.get('[data-testid="participant-list"]')
        .should('contain', 'test3@example.com');

      // Remove participant
      cy.get('[data-testid="remove-participant-test3@example.com"]').click();
      cy.get('[data-testid="confirm-remove-participant"]').click();

      // Verify participant removed
      cy.get('[data-testid="participant-list"]')
        .should('not.contain', 'test3@example.com');
    });
  });

  describe('User Settings', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/settings');
    });

    it('should update user profile', () => {
      // Update display name
      cy.get('[data-testid="display-name-input"]')
        .clear()
        .type('Updated Name{enter}');

      // Verify update
      cy.get('[data-testid="settings-saved-toast"]')
        .should('be.visible');
      cy.get('[data-testid="user-menu"]')
        .should('contain', 'Updated Name');
    });

    it('should update notification preferences', () => {
      // Toggle notification settings
      cy.get('[data-testid="email-notifications-toggle"]').click();
      cy.get('[data-testid="desktop-notifications-toggle"]').click();

      // Save changes
      cy.get('[data-testid="save-notification-settings"]').click();

      // Verify settings saved
      cy.get('[data-testid="settings-saved-toast"]')
        .should('be.visible');

      // Reload page and verify persistence
      cy.reload();
      cy.get('[data-testid="email-notifications-toggle"]')
        .should('not.be.checked');
      cy.get('[data-testid="desktop-notifications-toggle"]')
        .should('not.be.checked');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/');
    });

    it('should handle network errors gracefully', () => {
      // Create thread
      cy.createThread('Error Test Thread');

      // Simulate offline state
      cy.goOffline();

      // Try to send message
      cy.get('[data-testid="message-input"]')
        .type('This message should be queued{enter}');

      // Verify offline indicator
      cy.get('[data-testid="offline-indicator"]')
        .should('be.visible');

      // Verify message queued
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENDING');

      // Restore connection
      cy.goOnline();

      // Verify message sent
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENT');
    });

    it('should handle rate limiting', () => {
      cy.createThread('Rate Limit Test Thread');

      // Try to send messages rapidly
      for (let i = 0; i < 10; i++) {
        cy.get('[data-testid="message-input"]')
          .type(`Rapid message ${i}{enter}`);
      }

      // Verify rate limit warning
      cy.get('[data-testid="rate-limit-warning"]')
        .should('be.visible');
    });
  });
}); 