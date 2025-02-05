describe('Core Messaging Flows', () => {
  beforeEach(() => {
    // Login and setup
    cy.login(); // Custom command that handles Clerk authentication
    cy.visit('/');
  });

  describe('Basic Messaging', () => {
    it('should send and receive messages', () => {
      // Create a new thread
      cy.createThread('Test Thread');
      
      // Send a message
      cy.get('[data-testid="message-input"]')
        .type('Hello, World!{enter}');

      // Verify message appears in the thread
      cy.get('[data-testid="message-list"]')
        .should('contain', 'Hello, World!');

      // Verify message status
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENT');
    });

    it('should handle offline message queueing', () => {
      cy.createThread('Offline Test Thread');
      
      // Simulate offline state
      cy.goOffline();

      // Send message while offline
      cy.get('[data-testid="message-input"]')
        .type('Offline message{enter}');

      // Verify message shows as queued
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENDING');

      // Restore connection
      cy.goOnline();

      // Verify message is sent
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENT');
    });
  });

  describe('Threaded Messages', () => {
    it('should create and interact with message threads', () => {
      cy.createThread('Thread Test');
      
      // Send parent message
      cy.get('[data-testid="message-input"]')
        .type('Parent message{enter}');

      // Reply to message
      cy.get('[data-testid="message"]').first()
        .find('[data-testid="reply-button"]')
        .click();

      cy.get('[data-testid="reply-input"]')
        .type('This is a reply{enter}');

      // Verify reply appears
      cy.get('[data-testid="message-replies"]')
        .should('contain', 'This is a reply');

      // Verify thread structure
      cy.get('[data-testid="message"]').first()
        .should('have.attr', 'data-has-replies', 'true');
    });

    it('should expand and collapse threaded replies', () => {
      cy.createThread('Thread Expand Test');
      
      // Create a message with multiple replies
      cy.sendMessage('Parent message');
      cy.replyToMessage('Reply 1');
      cy.replyToMessage('Reply 2');

      // Verify replies are collapsed by default
      cy.get('[data-testid="message-replies"]')
        .should('not.be.visible');

      // Expand replies
      cy.get('[data-testid="expand-replies"]')
        .click();

      // Verify replies are visible
      cy.get('[data-testid="message-replies"]')
        .should('be.visible')
        .and('contain', 'Reply 1')
        .and('contain', 'Reply 2');

      // Collapse replies
      cy.get('[data-testid="expand-replies"]')
        .click();

      // Verify replies are hidden
      cy.get('[data-testid="message-replies"]')
        .should('not.be.visible');
    });
  });

  describe('Message Editing', () => {
    it('should edit messages and show edit history', () => {
      cy.createThread('Edit Test');
      
      // Send initial message
      cy.sendMessage('Original message');

      // Edit message
      cy.get('[data-testid="message"]').first()
        .find('[data-testid="edit-button"]')
        .click();

      cy.get('[data-testid="edit-input"]')
        .clear()
        .type('Edited message{enter}');

      // Verify edit appears
      cy.get('[data-testid="message"]').first()
        .should('contain', 'Edited message')
        .and('have.attr', 'data-edited', 'true');

      // Check edit history
      cy.get('[data-testid="show-edit-history"]')
        .click();

      cy.get('[data-testid="edit-history"]')
        .should('contain', 'Original message');
    });
  });

  describe('Real-time Updates', () => {
    it('should show typing indicators', () => {
      cy.createThread('Typing Test');
      
      // Start typing
      cy.get('[data-testid="message-input"]')
        .type('Hello');

      // Verify typing indicator appears for current user
      cy.get('[data-testid="typing-indicator"]')
        .should('contain', 'You are typing');

      // Clear input
      cy.get('[data-testid="message-input"]')
        .clear();

      // Verify typing indicator disappears
      cy.get('[data-testid="typing-indicator"]')
        .should('not.exist');
    });

    it('should update message status in real-time', () => {
      cy.createThread('Status Test');
      
      // Send message
      cy.sendMessage('Status test message');

      // Verify status progression
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENT')
        .and('have.attr', 'data-status', 'DELIVERED');

      // Login with another user in different tab
      cy.loginAsSecondUser();
      
      // Verify read status
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'READ');
    });
  });
}); 