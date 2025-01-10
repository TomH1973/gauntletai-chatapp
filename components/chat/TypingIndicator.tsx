'use client';

interface TypingUser {
  id: string;
  username: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (!users.length) return null;

  const text = users.length === 1
    ? `${users[0].username} is typing...`
    : users.length === 2
    ? `${users[0].username} and ${users[1].username} are typing...`
    : `${users[0].username} and ${users.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <span className="animate-bounce">•</span>
        <span className="animate-bounce [animation-delay:0.2s]">•</span>
        <span className="animate-bounce [animation-delay:0.4s]">•</span>
      </div>
      <span>{text}</span>
    </div>
  );
} 