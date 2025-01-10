import { useState, useCallback } from 'react';
import { Message, MessageStatus } from '@/types/chat';
import { nanoid } from 'nanoid';

/**
 * @interface OptimisticMessage
 * @description Extended Message type for optimistic updates with temporary state
 * 
 * @extends {Omit<Message, 'id'>}
 * @property {string} id - Temporary or permanent message ID
 * @property {string} tempId - Temporary ID for tracking optimistic updates
 * @property {boolean} isOptimistic - Flag indicating if this is an optimistic message
 * @property {boolean} [retrying] - Optional flag indicating if message send is being retried
 * @property {string} [error] - Optional error message if send failed
 */
interface OptimisticMessage extends Omit<Message, 'id'> {
  id: string;
  tempId: string;
  isOptimistic: boolean;
  retrying?: boolean;
  error?: string;
}

/**
 * @hook useOptimisticMessages
 * @description Custom hook for managing optimistic message updates in chat
 * 
 * Features:
 * - Optimistic message creation
 * - Temporary message state tracking
 * - Error handling and retry support
 * - Real-time message state updates
 * 
 * @param {Message[]} initialMessages - Initial array of messages
 * 
 * @returns {Object} Message state and control functions
 * @property {(Message | OptimisticMessage)[]} messages - Current messages including optimistic ones
 * @property {(content: string, userId: string, threadId: string) => string} addOptimisticMessage - Add a new optimistic message
 * @property {(tempId: string, message: Message) => void} updateOptimisticMessage - Update an optimistic message with real data
 * @property {(tempId: string, error: string) => void} markMessageError - Mark an optimistic message as failed
 * 
 * @example
 * ```tsx
 * const { messages, addOptimisticMessage, updateOptimisticMessage } = useOptimisticMessages(initialMessages);
 * 
 * // Add an optimistic message
 * const tempId = addOptimisticMessage('Hello!', currentUserId, threadId);
 * 
 * // Update with real message after API call
 * const response = await sendMessage('Hello!');
 * updateOptimisticMessage(tempId, response.data);
 * ```
 */
export function useOptimisticMessages(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<(Message | OptimisticMessage)[]>(initialMessages);

  const addOptimisticMessage = useCallback((content: string, userId: string, threadId: string) => {
    const tempId = nanoid();
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      content,
      userId,
      threadId,
      status: 'SENDING',
      isOptimistic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
      parentId: null,
      user: {
        id: userId,
        name: 'You', // This will be replaced when the real message comes back
        image: null,
      },
    };

    setMessages(prev => [...prev, optimisticMessage]);
    return tempId;
  }, []);

  const updateOptimisticMessage = useCallback((tempId: string, message: Message) => {
    setMessages(prev => 
      prev.map(msg => 
        (msg as OptimisticMessage).tempId === tempId ? message : msg
      )
    );
  }, []);

  const markMessageError = useCallback((tempId: string, error: string) => {
    setMessages(prev =>
      prev.map(msg =>
        (msg as OptimisticMessage).tempId === tempId
          ? { ...msg, status: 'FAILED', error, retrying: false }
          : msg
      )
    );
  }, []);

  const markMessageRetrying = useCallback((tempId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        (msg as OptimisticMessage).tempId === tempId
          ? { ...msg, status: 'SENDING', retrying: true, error: undefined }
          : msg
      )
    );
  }, []);

  const removeMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => (msg as OptimisticMessage).tempId !== tempId));
  }, []);

  const updateMessageStatus = useCallback((messageId: string, status: MessageStatus) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    );
  }, []);

  return {
    messages,
    addOptimisticMessage,
    updateOptimisticMessage,
    markMessageError,
    markMessageRetrying,
    removeMessage,
    updateMessageStatus,
  };
} 