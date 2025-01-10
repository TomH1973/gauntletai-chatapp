import { useState, useCallback } from 'react';
import { Message, MessageStatus } from '@/types/chat';
import { nanoid } from 'nanoid';

interface OptimisticMessage extends Omit<Message, 'id'> {
  id: string;
  tempId: string;
  isOptimistic: boolean;
  retrying?: boolean;
  error?: string;
}

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