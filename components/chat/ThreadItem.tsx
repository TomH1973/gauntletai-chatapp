'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Thread, User } from '@/types';

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  onClickAction: () => void;
  onlineParticipants: User[];
}

export default function ThreadItem({
  thread,
  isActive,
  onClickAction,
  onlineParticipants
}: ThreadItemProps) {
  const lastMessage = thread.messages?.[thread.messages?.length - 1];
  
  const formattedTime = useMemo(() => {
    if (!lastMessage) return '';
    return format(new Date(lastMessage.createdAt), 'HH:mm');
  }, [lastMessage]);

  const participantNames = useMemo(() => {
    return (thread.participants || [])
      .map(p => p.username || 'Unknown')
      .join(', ');
  }, [thread.participants]);

  return (
    <button
      onClick={onClickAction}
      className={`w-full p-4 text-left cursor-pointer hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-blue-50' : ''
      }`}
      aria-selected={isActive}
      role="tab"
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium truncate">
          {thread.name || participantNames}
        </h3>
        {lastMessage && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formattedTime}
          </span>
        )}
      </div>
      {lastMessage && (
        <p className="text-sm text-gray-600 truncate">
          {lastMessage.content}
        </p>
      )}
      {onlineParticipants.length > 0 && (
        <div className="mt-1 text-xs text-green-600">
          {onlineParticipants.length} online
        </div>
      )}
    </button>
  );
} 