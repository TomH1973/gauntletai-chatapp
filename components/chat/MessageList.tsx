'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { ThreadedMessage } from './ThreadedMessage';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReply: (content: string, parentId: string) => void;
  isLoading?: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  onReply,
  isLoading = false
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return <div className="flex-1 p-4">Loading messages...</div>;
  }

  // Filter out replies to show only top-level messages
  const topLevelMessages = messages.filter(message => !message.parentId);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-6">
        {topLevelMessages.map((message) => (
          <ThreadedMessage
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onReply={onReply}
          />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
} 