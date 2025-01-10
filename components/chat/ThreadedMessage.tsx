import { useState } from 'react';
import { Message } from '@/types/chat';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageComposer } from './MessageComposer';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * @interface ThreadedMessageProps
 * @description Props for the ThreadedMessage component
 */
interface ThreadedMessageProps {
  /** The message object to display */
  message: Message;
  /** ID of the current user viewing the message */
  currentUserId: string;
  /** Callback function to handle replies */
  onReply: (content: string, parentId: string) => void;
  /** Current nesting depth of the message */
  depth?: number;
  /** Maximum allowed nesting depth */
  maxDepth?: number;
}

/**
 * @component ThreadedMessage
 * @description A component that renders a message with threaded replies support
 * 
 * Features:
 * - Nested reply threads
 * - Collapsible replies
 * - Reply composition
 * - Depth limiting
 * - Avatar display
 * - Timestamp formatting
 * 
 * @example
 * ```tsx
 * <ThreadedMessage
 *   message={messageData}
 *   currentUserId="user123"
 *   onReply={handleReply}
 *   depth={0}
 *   maxDepth={5}
 * />
 * ```
 */
export function ThreadedMessage({
  message,
  currentUserId,
  onReply,
  depth = 0,
  maxDepth = 5
}: ThreadedMessageProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const hasReplies = message.replies && message.replies.length > 0;
  const canNest = depth < maxDepth;

  const handleReply = (content: string) => {
    onReply(content, message.id);
    setIsReplying(false);
  };

  return (
    <div className={cn(
      "flex flex-col gap-2",
      depth > 0 && "ml-6 pl-4 border-l"
    )}>
      <div className="flex items-start gap-3">
        <Avatar>
          <img
            src={message.user.image || '/default-avatar.png'}
            alt={message.user.name || 'User'}
            className="w-8 h-8 rounded-full"
          />
        </Avatar>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium">{message.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-1">{message.content}</p>
          <div className="flex items-center gap-2 mt-2">
            {canNest && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
              >
                Reply
              </Button>
            )}
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? 'Hide replies' : `Show ${message.replies.length} replies`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isReplying && (
        <div className="ml-11">
          <MessageComposer
            threadId={message.threadId}
            onSendMessage={handleReply}
            replyTo={message}
            onCancelReply={() => setIsReplying(false)}
          />
        </div>
      )}

      {hasReplies && showReplies && (
        <div className="space-y-4">
          {message.replies.map((reply) => (
            <ThreadedMessage
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
} 