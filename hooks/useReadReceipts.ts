import { cache, CACHE_KEYS, CACHE_TTL } from '@/config/redis';
import logger from '@/lib/logger';
import { Message, Thread } from '@/types';
import { useSession } from 'next-auth/react';

export function useReadReceipts() {
  const { data: session } = useSession();
  
  const markAsRead = async (messageId: string, threadId: string) => {
    if (!session?.user?.id) return;
    
    try {
      const [message, thread] = await Promise.all([
        cache.get<Message>(CACHE_KEYS.message(messageId)),
        cache.get<Thread>(CACHE_KEYS.thread(threadId))
      ]);

      if (!message || !thread) {
        logger.warn('Attempted to mark non-existent message/thread as read', { messageId, threadId });
        return;
      }

      const updatedMessage = {
        ...message,
        readBy: [...(message.readBy || []), session.user.id]
      };

      await cache.set(CACHE_KEYS.message(messageId), updatedMessage, CACHE_TTL.MESSAGE);
    } catch (err) {
      logger.error('Failed to mark message as read', { messageId, threadId, error: err });
    }
  };

  return { markAsRead };
} 