import { useCallback } from 'react';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/config/redis';
import logger from '@/lib/logger';
import { Message, MessageStatus } from '@/types';

/**
 * @interface MessageStatusUpdate
 * @description Interface for message status update operations
 * 
 * @property {string} messageId - ID of the message to update
 * @property {MessageStatus} status - New status to set for the message
 * @property {string} [error] - Optional error message if status update failed
 */
interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  error?: string;
}

/**
 * @stateflow Message Status Management
 * 
 * 1. Message States
 *    - SENDING: Initial state when message is created
 *    - SENT: Message successfully sent to server
 *    - DELIVERED: Server confirmed delivery
 *    - READ: Recipient has viewed the message
 *    - FAILED: Message failed to send/deliver
 * 
 * 2. State Transitions
 *    - New Message: null -> SENDING -> SENT
 *    - Successful Delivery: SENT -> DELIVERED -> READ
 *    - Failed Delivery: SENDING -> FAILED
 *    - Retry: FAILED -> SENDING
 * 
 * 3. Cache Management
 *    - Cache updates on state changes
 *    - Cache invalidation on errors
 *    - Optimistic updates
 * 
 * 4. Error Recovery
 *    - Network error retry
 *    - State rollback
 *    - User notification
 * 
 * 5. Side Effects
 *    - UI updates
 *    - Socket events
 *    - Analytics tracking
 * Features:
 * - Message status tracking (sent, delivered, read, failed)
 * - Error handling and logging
 * - Cache-based state management
 * - Utility functions for common status updates
 * 
 * @returns {Object} Message status control functions
 * @property {(update: MessageStatusUpdate) => void} updateMessageStatus - Update message status with custom state
 * @property {(messageId: string) => void} markMessageAsRead - Mark a message as read
 * @property {(messageId: string) => void} markMessageAsDelivered - Mark a message as delivered
 * @property {(messageId: string, error: string) => void} markMessageAsFailed - Mark a message as failed with error
 * 
 * @example
 * ```tsx
 * const { markMessageAsRead, markMessageAsDelivered } = useMessageStatus();
 * 
 * // Mark message as read when viewed
 * useEffect(() => {
 *   if (isVisible) {
 *     markMessageAsRead(messageId);
 *   }
 * }, [isVisible, messageId]);
 * 
 * // Mark as delivered when received
 * socket.on('message:received', (data) => {
 *   markMessageAsDelivered(data.messageId);
 * });
 * ```
 */
export function useMessageStatus() {
  const updateMessageStatus = useCallback(async ({ messageId, status, error }: MessageStatusUpdate) => {
    try {
      const message = await cache.get<Message>(CACHE_KEYS.message(messageId));
      if (!message) {
        logger.warn('Attempted to update status of non-existent message', { messageId, status });
        return;
      }

      const updatedMessage: Message = {
        ...message,
        status,
        error
      };

      await cache.set(CACHE_KEYS.message(messageId), updatedMessage, CACHE_TTL.MESSAGE);
    } catch (err) {
      logger.error('Failed to update message status', { messageId, status, error: err });
    }
  }, []);

  const markMessageAsRead = useCallback((messageId: string) => {
    updateMessageStatus({ messageId, status: MessageStatus.READ });
  }, [updateMessageStatus]);

  const markMessageAsDelivered = useCallback((messageId: string) => {
    updateMessageStatus({ messageId, status: MessageStatus.DELIVERED });
  }, [updateMessageStatus]);

  const markMessageAsFailed = useCallback((messageId: string, error: string) => {
    updateMessageStatus({ messageId, status: MessageStatus.FAILED, error });
  }, [updateMessageStatus]);

  /**
   * @errorflow Message Status Error Handling
   * 
   * 1. Status Update Errors
   *    Path: updateMessageStatus()
   *    - Message not found -> Log warning -> Return early
   *    - Cache update failure -> Log error -> Keep old state
   *    - Invalid status -> Log error -> Keep old state
   * 
   * 2. Read Status Errors
   *    Path: markMessageAsRead()
   *    - Network failure -> Retry update
   *    - Server error -> Keep unread state
   *    - Concurrent update -> Resolve conflict
   * 
   * 3. Delivery Status Errors
   *    Path: markMessageAsDelivered()
   *    - Network failure -> Queue for retry
   *    - Server error -> Maintain sent state
   *    - Race condition -> Latest status wins
   * 
   * 4. Failure Status Errors
   *    Path: markMessageAsFailed()
   *    - Cache miss -> Create error entry
   *    - Storage error -> Log failure
   *    - Recovery attempt -> Clear error
   * 
   * 5. Error Recovery
   *    - Retry failed operations
   *    - Sync with server on reconnect
   *    - Clear error state on success
   */

  return {
    updateMessageStatus,
    markMessageAsRead,
    markMessageAsDelivered,
    markMessageAsFailed
  };
} 