'use client';

import { useEffect, useRef } from 'react';
import { Message as MessageType, User } from '@/types/chat';
import { ThreadedMessage } from './ThreadedMessage';
import { Spinner } from '@/components/ui/spinner';

interface MessageListProps {
  messages: MessageType[];
  currentUser: User;
  isLoading?: boolean;
  onReply?: (parentId: string, content: string) => void;
}

export function MessageList({ messages, currentUser, isLoading, onReply }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter for root messages (no parentId)
  const rootMessages = messages.filter(message => !message.parentId);

  return (
    <div className="flex-1 overflow-y-auto px-2 md:px-4 py-4 space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rootMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No messages yet
        </div>
      ) : (
        <>
          {rootMessages.map((message) => {
            // Find replies for this message
            const replies = messages.filter(m => m.parentId === message.id);
            
            return (
              <ThreadedMessage
                key={message.id}
                {...message}
                currentUser={currentUser}
                replies={replies}
                onReply={onReply}
                className="max-w-[85%] md:max-w-[75%] lg:max-w-[65%]"
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
} 