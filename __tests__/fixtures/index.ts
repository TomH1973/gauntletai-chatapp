export * from './users';
export * from './threads';
export * from './messages';

// Test data utilities
export const resetTestData = () => {
  // Reset any mutable test data to its initial state
  // This is useful when tests modify the test data
};

// Common test scenarios
export const scenarios = {
  newUserJoinsThread: {
    threadId: 'thread-alice-bob-id',
    newUserId: 'user-charlie-id',
    expectedParticipantCount: 3
  },
  messageWithMentions: {
    messageId: 'message-3',
    mentionedUserIds: ['user-bob-id', 'user-charlie-id'],
    threadId: 'thread-group-id'
  },
  threadWithUnreadMessages: {
    threadId: 'thread-group-id',
    unreadCount: 5,
    lastMessageAt: new Date('2024-01-09T12:00:00Z')
  }
}; 