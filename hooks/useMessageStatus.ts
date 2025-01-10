import { useCallback } from 'react';
import { messageCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { MessageStatus } from '@/types';
import type { Message } from '@/types';

interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  error?: string;
}

export function useMessageStatus() {
  const updateMessageStatus = useCallback(({ messageId, status, error }: MessageStatusUpdate) => {
    try {
      const message = messageCache.get(messageId);
      if (!message) {
        logger.warn('Attempted to update status of non-existent message', { messageId, status });
        return;
      }

      const updatedMessage: Message = {
        ...message,
        status,
        error: error || undefined
      };

      messageCache.set(messageId, updatedMessage);
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

  return {
    updateMessageStatus,
    markMessageAsRead,
    markMessageAsDelivered,
    markMessageAsFailed
  };
} 