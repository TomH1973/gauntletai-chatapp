'use client';

import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  profileImage?: string;
}

interface MentionListProps {
  users: User[];
  selectedIndex: number;
  onSelect: (user: User) => void;
  className?: string;
}

/**
 * @component MentionList
 * @description A component that displays a list of mentionable users
 */
export function MentionList({
  users,
  selectedIndex,
  onSelect,
  className
}: MentionListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  if (!users.length) return null;

  return (
    <div
      ref={listRef}
      className={cn(
        "absolute z-50 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md",
        className
      )}
    >
      {users.map((user, index) => (
        <div
          key={user.id}
          ref={index === selectedIndex ? selectedRef : null}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer",
            index === selectedIndex && "bg-accent text-accent-foreground"
          )}
          onClick={() => onSelect(user)}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.profileImage} />
            <AvatarFallback>{user.username[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{user.username}</span>
        </div>
      ))}
    </div>
  );
} 