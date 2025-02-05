import { useState, useCallback } from 'react';
import { Thread, Message } from '@/types/chat';

export function useChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentThread) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/threads/${currentThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const newMessage = await response.json();
      setMessages(prev => [...prev, newMessage]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentThread]);

  const selectThread = useCallback(async (thread: Thread) => {
    setCurrentThread(thread);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/threads/${thread.id}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const messages = await response.json();
      setMessages(messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createThread = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      });

      if (!response.ok) throw new Error('Failed to create thread');

      const newThread = await response.json();
      setThreads(prev => [...prev, newThread]);
      await selectThread(newThread);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectThread]);

  return {
    threads,
    currentThread,
    messages,
    isLoading,
    error,
    sendMessage,
    selectThread,
    createThread
  };
} 