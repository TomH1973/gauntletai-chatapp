'use client';

import { Thread, User } from '@/types';
import Image from 'next/image';

interface ThreadHeaderProps {
  thread: Thread;
  onlineUsers?: Set<string>;
  typingUsers?: Set<string>;
}

export default function ThreadHeader({ thread, onlineUsers = new Set(), typingUsers = new Set() }: ThreadHeaderProps) {
  const participants = thread.participants || [];
  const isGroup = participants.length > 2;
  const onlineParticipants = participants.filter(p => onlineUsers.has(p.id));
  const typingParticipants = participants.filter(p => typingUsers.has(p.id));

  return (
    <div className="p-4 border-b flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {isGroup ? (
          <div className="relative w-10 h-10">
            <div className="absolute top-0 left-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm text-gray-500">
                {participants[0]?.username?.[0] || '?'}
              </span>
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm text-gray-500">
                {participants[1]?.username?.[0] || '?'}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10">
            {participants[0]?.imageUrl ? (
              <Image
                src={participants[0].imageUrl}
                alt={participants[0].username || 'User avatar'}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm text-gray-500">
                  {participants[0]?.username?.[0] || '?'}
                </span>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="font-semibold">
            {thread.name || (isGroup
              ? participants.map(p => p.username).join(', ')
              : participants[0]?.username || 'Unknown')}
          </h2>
          <div className="text-sm text-gray-500">
            {onlineParticipants.length > 0 && (
              <span>
                {onlineParticipants.length} online
                {typingParticipants.length > 0 && ' • '}
              </span>
            )}
            {typingParticipants.length > 0 && (
              <span className="animate-pulse">
                {typingParticipants.length === 1
                  ? `${typingParticipants[0].username} is typing...`
                  : `${typingParticipants.length} people are typing...`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Add any action buttons here */}
      </div>
    </div>
  );
} 