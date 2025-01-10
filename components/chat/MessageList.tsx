'use client';

import { useEffect, useRef } from 'react';
import { Message, User } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './MessageItem';
import { Spinner } from '@/components/ui/spinner';
import { groupMessages, type MessageGroup } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  isLoading?: boolean;
}

export function MessageList({ messages, currentUser, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageGroups = groupMessages(messages);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-6">
        {messageGroups.map((group, groupIndex) => {
          const firstMessage = group.messages[0];
          const lastMessage = group.messages[group.messages.length - 1];
          const isOwn = group.senderId === currentUser.id;

          return (
            <div key={`${group.senderId}-${groupIndex}`} className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{firstMessage.user.username}</span>
                <span>•</span>
                <time>{format(new Date(firstMessage.createdAt), 'HH:mm')}</time>
              </div>
              <div className="space-y-1">
                {group.messages.map((message, messageIndex) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    currentUser={currentUser}
                    showAvatar={messageIndex === group.messages.length - 1}
                    showStatus={messageIndex === group.messages.length - 1 && isOwn}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
} 