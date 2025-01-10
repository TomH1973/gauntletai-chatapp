import { useCallback } from 'react';
import { messageCache, threadCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { Message, Thread, ThreadParticipant } from '@/types';

interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: Date;
}

export function useReadReceipts(threadId: string) {
  const updateReadReceipts = useCallback((receipts: ReadReceipt[]) => {
    try {
      const thread = threadCache.get(threadId);
      if (!thread) {
        logger.warn('Attempted to update read receipts for non-existent thread', { threadId });
        return;
      }

      // Update participant's lastReadAt
      const updatedParticipants = thread.participants.map(participant => {
        const latestReceipt = receipts
          .filter(r => r.userId === participant.userId)
          .sort((a, b) => b.readAt.getTime() - a.readAt.getTime())[0];

        if (latestReceipt) {
          return {
            ...participant,
            lastReadAt: latestReceipt.readAt
          };
        }
        return participant;
      });

      // Update thread with new participants
      threadCache.set(threadId, {
        ...thread,
        participants: updatedParticipants
      });

      // Update message read status
      receipts.forEach(receipt => {
        const message = messageCache.get(receipt.messageId);
        if (message) {
          const readAt = { ...(message.readAt || {}) };
          readAt[receipt.userId] = receipt.readAt;

          messageCache.set(receipt.messageId, {
            ...message,
            readBy: Array.from(new Set([...message.readBy, receipt.userId])),
            readAt
          });
        }
      });
    } catch (err) {
      logger.error('Failed to update read receipts', { threadId, error: err });
    }
  }, [threadId]);

  const markThreadAsRead = useCallback((userId: string) => {
    try {
      const thread = threadCache.get(threadId);
      if (!thread) {
        logger.warn('Attempted to mark non-existent thread as read', { threadId });
        return;
      }

      const now = new Date();
      const receipts: ReadReceipt[] = thread.messages
        .filter(m => !m.readBy.includes(userId))
        .map(m => ({
          messageId: m.id,
          userId,
          readAt: now
        }));

      updateReadReceipts(receipts);
    } catch (err) {
      logger.error('Failed to mark thread as read', { threadId, error: err });
    }
  }, [threadId, updateReadReceipts]);

  return {
    updateReadReceipts,
    markThreadAsRead
  };
} 