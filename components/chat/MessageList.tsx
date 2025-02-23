'use client';

import { forwardRef } from 'react';
import { Message as MessageComponent } from './Message';
import { Message as MessageType, User, MessageReaction, MessageAttachment } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AvatarImage, AvatarFallback, Avatar } from '@/components/ui/avatar';

interface MessageListProps {
  messages: MessageType[];
  currentUser: User;
  isLoading?: boolean;
  highlightedMessageId?: string | null;
  onReactionAdd?: (messageId: string, type: string) => void;
  onReactionRemove?: (messageId: string, type: string) => void;
  onAttachmentDownload?: (attachment: MessageAttachment) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ 
    messages, 
    currentUser, 
    isLoading, 
    highlightedMessageId,
    onReactionAdd,
    onReactionRemove,
    onAttachmentDownload
  }, ref) => {
    if (isLoading) {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4" ref={ref}>
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageComponent
              key={message.id}
              id={message.id}
              content={message.content}
              createdAt={message.createdAt}
              user={message.user}
              reactions={message.reactions}
              attachments={message.attachments}
              currentUser={currentUser}
              isHighlighted={message.id === highlightedMessageId}
              onReactionAdd={onReactionAdd}
              onReactionRemove={onReactionRemove}
              onAttachmentDownload={onAttachmentDownload}
            />
          ))}
        </div>
      </div>
    );
  }
);

MessageList.displayName = 'MessageList'; 