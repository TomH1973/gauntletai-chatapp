import { Message, User } from '@/types/chat';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ThreadedMessageProps extends Message {
  currentUser: User;
  replies?: Message[];
  onReply?: (parentId: string, content: string) => void;
  className?: string;
}

export function ThreadedMessage({ 
  id,
  content,
  createdAt,
  sender,
  currentUser,
  replies = [],
  onReply,
  className
}: ThreadedMessageProps) {
  const isOwnMessage = sender.id === currentUser.id;

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(
        "flex gap-2",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}>
        <img
          src={sender.image || '/default-avatar.png'}
          alt={sender.name}
          className="w-8 h-8 rounded-full"
        />
        <div className={cn(
          "rounded-lg p-3 max-w-[70%]",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium">{sender.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-10 space-y-2">
          {replies.map((reply) => (
            <ThreadedMessage
              key={reply.id}
              {...reply}
              currentUser={currentUser}
              className="max-w-[95%]"
            />
          ))}
        </div>
      )}
    </div>
  );
} 