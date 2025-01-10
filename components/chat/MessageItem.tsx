'use client';

import { useState } from 'react';
import { Message, User } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageStatus } from './MessageStatus';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  showAvatar?: boolean;
  showStatus?: boolean;
}

export function MessageItem({
  message,
  currentUser,
  showAvatar = true,
  showStatus = true,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = message.userId === currentUser.id;

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSave = () => {
    // TODO: Implement edit functionality
    setIsEditing(false);
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
  };

  return (
    <div className={cn(
      "flex gap-3 group",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {showAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.user?.profileImage || undefined} />
          <AvatarFallback>{message.user?.username?.[0] || '?'}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "flex flex-col max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "mt-1 rounded-lg p-3",
          isOwn 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[60px] p-2 rounded border"
              autoFocus
            />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {message.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 rounded bg-muted"
              >
                <span className="text-sm">{attachment.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(attachment.size / 1024)}KB)
                </span>
              </div>
            ))}
          </div>
        )}

        {isOwn && (
          <div className={cn(
            "mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity",
            isEditing ? "opacity-100" : ""
          )}>
            {isEditing ? (
              <>
                <Button variant="default" onClick={handleSave}>Save</Button>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {showStatus && isOwn && <MessageStatus status={message.status} />}

        {message.reactions?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((reaction, index) => (
              <div
                key={`${reaction.userId}-${reaction.emoji}-${index}`}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm"
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs text-muted-foreground">1</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 