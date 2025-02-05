import { WebSocket } from 'ws';
import { expect } from 'chai';

interface TestMessage {
  type: string;
  content: string;
  threadId?: string;
  userId?: string;
  timestamp?: number;
}

describe('WebSocket Security Tests', () => {
  let ws: WebSocket;
  const validToken = Cypress.env('USER_TOKEN');
  const invalidToken = 'invalid_token';
  const wsUrl = Cypress.env('WS_URL') || 'ws://localhost:3002';

  beforeEach(() => {
    // Reset WebSocket connection before each test
    if (ws) {
      ws.close();
    }
  });

  afterEach(() => {
    // Clean up WebSocket connection after each test
    if (ws) {
      ws.close();
    }
  });

  describe('Connection Security', () => {
    it('should reject connection without authentication token', (done) => {
      ws = new WebSocket(wsUrl);
      
      ws.onerror = () => {
        expect(ws.readyState).to.equal(WebSocket.CLOSED);
        done();
      };
    });

    it('should reject connection with invalid token', (done) => {
      ws = new WebSocket(`${wsUrl}?token=${invalidToken}`);
      
      ws.onerror = () => {
        expect(ws.readyState).to.equal(WebSocket.CLOSED);
        done();
      };
    });

    it('should accept connection with valid token', (done) => {
      ws = new WebSocket(`${wsUrl}?token=${validToken}`);
      
      ws.onopen = () => {
        expect(ws.readyState).to.equal(WebSocket.OPEN);
        done();
      };
    });
  });

  describe('Message Security', () => {
    beforeEach((done) => {
      // Establish authenticated connection before each test
      ws = new WebSocket(`${wsUrl}?token=${validToken}`);
      ws.onopen = () => done();
    });

    it('should reject oversized messages', (done) => {
      const largeMessage: TestMessage = {
        type: 'message',
        content: 'x'.repeat(1000000), // 1MB message
        threadId: '123'
      };

      ws.send(JSON.stringify(largeMessage));
      
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data.toString());
        expect(response.error).to.include('Message size exceeds limit');
        done();
      };
    });

    it('should sanitize message content', (done) => {
      const xssMessage: TestMessage = {
        type: 'message',
        content: '<script>alert("xss")</script>',
        threadId: '123'
      };

      ws.send(JSON.stringify(xssMessage));
      
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data.toString());
        expect(response.content).to.not.include('<script>');
        done();
      };
    });

    it('should prevent message spoofing', (done) => {
      const spoofedMessage: TestMessage = {
        type: 'message',
        content: 'Hello',
        threadId: '123',
        userId: 'different_user_id' // Attempting to spoof another user
      };

      ws.send(JSON.stringify(spoofedMessage));
      
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data.toString());
        expect(response.userId).to.not.equal(spoofedMessage.userId);
        done();
      };
    });
  });

  describe('Rate Limiting', () => {
    beforeEach((done) => {
      ws = new WebSocket(`${wsUrl}?token=${validToken}`);
      ws.onopen = () => done();
    });

    it('should enforce message rate limits', (done) => {
      let messageCount = 0;
      const sendMessages = () => {
        if (messageCount < 100) { // Try to send 100 messages rapidly
          ws.send(JSON.stringify({
            type: 'message',
            content: 'Test message',
            threadId: '123'
          }));
          messageCount++;
          setTimeout(sendMessages, 10);
        } else {
          done();
        }
      };

      ws.onmessage = (event) => {
        const response = JSON.parse(event.data.toString());
        if (response.error) {
          expect(response.error).to.include('Rate limit exceeded');
          done();
        }
      };

      sendMessages();
    });
  });

  describe('Thread Access Control', () => {
    beforeEach((done) => {
      ws = new WebSocket(`${wsUrl}?token=${validToken}`);
      ws.onopen = () => done();
    });

    it('should prevent unauthorized thread access', (done) => {
      const unauthorizedMessage: TestMessage = {
        type: 'message',
        content: 'Hello',
        threadId: 'unauthorized_thread_id'
      };

      ws.send(JSON.stringify(unauthorizedMessage));
      
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data.toString());
        expect(response.error).to.include('Unauthorized access');
        done();
      };
    });
  });
}); 