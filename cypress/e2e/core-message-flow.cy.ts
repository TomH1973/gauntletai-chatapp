import { v4 as uuidv4 } from 'uuid';

describe('Core Message Flow', () => {
  const testThread = `Test Thread ${uuidv4()}`;
  const testMessage = 'Hello, this is a test message!';
  const testReply = 'This is a reply to the test message';

  beforeEach(() => {
    cy.login(); // Custom command that handles Clerk authentication
    cy.visit('/');
    cy.intercept('POST', '/api/messages/*').as('sendMessage');
    cy.intercept('GET', '/api/messages/*').as('getMessages');
  });

  it('should complete the full message lifecycle', () => {
    // 1. Create a new thread
    cy.get('[data-testid="new-thread-button"]').click();
    cy.get('[data-testid="thread-name-input"]').type(testThread);
    cy.get('[data-testid="create-thread-submit"]').click();
    
    // 2. Send a message
    cy.get('[data-testid="message-input"]')
      .should('be.visible')
      .type(testMessage);
    cy.get('[data-testid="send-message-button"]').click();

    // 3. Verify message appears and WebSocket event is received
    cy.wait('@sendMessage').then((interception) => {
      expect(interception.response?.statusCode).to.equal(201);
      
      cy.get('[data-testid="message-content"]')
        .should('contain', testMessage);
      
      // Check message status progression
      cy.get('[data-testid="message-status"]')
        .should('have.attr', 'data-status', 'SENT')
        .and('have.attr', 'data-status', 'DELIVERED');
    });

    // 4. Test message search
    cy.get('[data-testid="search-input"]').type(testMessage);
    cy.get('[data-testid="search-results"]')
      .should('contain', testMessage)
      .and('contain', testThread);

    // 5. Test message reply
    cy.get('[data-testid="message-actions"]').first().click();
    cy.get('[data-testid="reply-button"]').click();
    cy.get('[data-testid="reply-input"]').type(testReply);
    cy.get('[data-testid="send-reply-button"]').click();

    // 6. Verify reply appears and is linked
    cy.get('[data-testid="message-reply"]')
      .should('contain', testReply)
      .and('have.attr', 'data-parent-id');

    // 7. Test real-time updates
    cy.window().then((win) => {
      // Verify socket connection
      expect(win.socket.connected).to.be.true;
      
      // Test typing indicators
      cy.get('[data-testid="message-input"]').type('typing...');
      cy.get('[data-testid="typing-indicator"]')
        .should('be.visible')
        .and('contain', 'You are typing');
    });

    // 8. Test error recovery
    cy.intercept('POST', '/api/messages/*', {
      statusCode: 500,
      delay: 1000
    }).as('failedMessage');

    cy.get('[data-testid="message-input"]').type('This should fail{enter}');
    
    // Verify error handling and retry mechanism
    cy.get('[data-testid="message-error"]')
      .should('be.visible')
      .and('contain', 'Failed to send');
    
    cy.get('[data-testid="retry-button"]').click();

    // 9. Test offline behavior
    cy.window().then((win) => {
      win.socket.disconnect();
      
      cy.get('[data-testid="connection-status"]')
        .should('contain', 'Offline');

      // Try sending message while offline
      cy.get('[data-testid="message-input"]').type('Offline message{enter}');
      
      // Message should be queued
      cy.get('[data-testid="message-queue-indicator"]')
        .should('be.visible')
        .and('contain', 'Messages queued');

      // Reconnect and verify message sends
      win.socket.connect();
      cy.get('[data-testid="message-queue-indicator"]')
        .should('not.exist');
      cy.get('[data-testid="message-content"]')
        .should('contain', 'Offline message');
    });
  });

  it('should handle file attachments', () => {
    // Create thread if not exists
    cy.contains(testThread).click();

    // Test file upload
    cy.fixture('test-image.jpg').then(fileContent => {
      cy.get('[data-testid="file-input"]')
        .attachFile({
          fileContent,
          fileName: 'test-image.jpg',
          mimeType: 'image/jpeg'
        });
    });

    // Verify upload progress and completion
    cy.get('[data-testid="upload-progress"]')
      .should('exist')
      .and('have.attr', 'value', '100');

    // Verify file preview
    cy.get('[data-testid="file-preview"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'test-image');

    // Send message with attachment
    cy.get('[data-testid="send-message-button"]').click();

    // Verify file in message
    cy.get('[data-testid="message-attachment"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'test-image');
  });

  it('should maintain message order and history', () => {
    cy.contains(testThread).click();

    // Send multiple messages rapidly
    const messages = Array.from({ length: 5 }, (_, i) => `Test message ${i + 1}`);
    
    messages.forEach(msg => {
      cy.get('[data-testid="message-input"]').type(`${msg}{enter}`);
    });

    // Verify messages appear in correct order
    cy.get('[data-testid="message-content"]').then($messages => {
      const texts = $messages.map((_, el) => el.textContent).get();
      expect(texts.reverse().slice(0, 5)).to.deep.equal(messages);
    });

    // Test message history loading
    cy.get('[data-testid="load-more-messages"]').click();
    cy.get('[data-testid="message-content"]')
      .should('have.length.greaterThan', 5);

    // Verify message persistence after reload
    cy.reload();
    messages.forEach(msg => {
      cy.get('[data-testid="message-content"]')
        .should('contain', msg);
    });
  });
}); 