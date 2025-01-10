'use client';

import { formatDistanceToNow } from 'date-fns';
import { Thread, User } from '@/types/chat';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';

interface ThreadListProps {
  threads: Thread[];
  currentUser: User;
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
}

export function ThreadList({ threads, currentUser, selectedThreadId, onThreadSelect }: ThreadListProps) {
  const { isOnline, getLastSeen } = usePresence();

  return (
    <div className="w-80 border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Conversations</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => {
          const otherParticipants = thread.participants
            .filter(p => p.userId !== currentUser.id)
            .map(p => p.user);

          const isGroupChat = otherParticipants.length > 1;
          const title = thread.name || otherParticipants.map(p => p.name).join(', ');
          
          // For 1:1 chats, show presence indicator
          const otherUser = !isGroupChat ? otherParticipants[0] : null;
          const isUserOnline = otherUser ? isOnline(otherUser.id) : false;
          const lastSeen = otherUser ? getLastSeen(otherUser.id) : null;

          return (
            <button
              key={thread.id}
              onClick={() => onThreadSelect(thread.id)}
              className={cn(
                "w-full p-4 text-left hover:bg-accent transition-colors",
                "flex items-center gap-3",
                selectedThreadId === thread.id && "bg-accent"
              )}
            >
              <div className="relative">
                {isGroupChat ? (
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {otherParticipants.length}
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={otherUser?.image || '/default-avatar.png'}
                      alt={otherUser?.name || 'User'}
                      className="w-10 h-10 rounded-full"
                    />
                    {isUserOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{title}</div>
                {!isGroupChat && !isUserOnline && lastSeen && (
                  <div className="text-sm text-muted-foreground truncate">
                    Last seen {formatDistanceToNow(lastSeen, { addSuffix: true })}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
} 