'use client';

import { useState, useCallback } from 'react';
import type { Message, MessageReaction, User } from '@/types';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/auth-context';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { Button } from '@/components/ui/button';
import { Pencil, Smile } from 'lucide-react';

interface MessageWithUser extends Message {
  user: User;
}

interface MessageActionsProps {
  message: MessageWithUser;
  onEdit: (messageId: string) => void;
}

interface GroupedReactions {
  [emoji: string]: MessageReaction[];
}

export function MessageActions({ message, onEdit }: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();

  const handleReaction = useCallback((emoji: string) => {
    if (!socket || !user) return;
    socket.emit('message:react', { messageId: message.id, emoji });
    setShowEmojiPicker(false);
  }, [socket, message.id, user]);

  const handleRemoveReaction = useCallback((emoji: string) => {
    if (!socket || !user) return;
    socket.emit('message:react:remove', { messageId: message.id, emoji });
  }, [socket, message.id, user]);

  const groupedReactions: GroupedReactions = message.reactions.reduce((acc, reaction) => {
    if (!reaction.emoji) return acc;
    return {
      ...acc,
      [reaction.emoji]: [...(acc[reaction.emoji] || []), reaction]
    };
  }, {} as GroupedReactions);

  const canEdit = user?.id === message.userId;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(message.id)}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Smile className="w-4 h-4" />
        </Button>
      </div>

      {showEmojiPicker && (
        <div className="absolute z-10 mt-1">
          <EmojiPicker onSelectAction={handleReaction} onCloseAction={() => setShowEmojiPicker(false)} />
        </div>
      )}

      {Object.entries(groupedReactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(groupedReactions).map(([emoji, reactions]: [string, MessageReaction[]]) => {
            const hasReacted = reactions.some(r => r.userId === user?.id);
            return (
              <Button
                key={emoji}
                variant={hasReacted ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => hasReacted ? handleRemoveReaction(emoji) : handleReaction(emoji)}
                className="px-2 py-1 text-sm"
              >
                {emoji} {reactions.length}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
} 