import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from 'date-fns';

// This component renders an individual message and its replies, supporting nested conversations

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      profileImage: string;
    };
    replies?: MessageItemProps['message'][];
  };
  onReply: (parentId: string, content: string) => void;
  depth?: number;
}

export function MessageItem({ message, onReply, depth = 0 }: MessageItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(message.id, replyContent);
      setReplyContent('');
      setIsReplying(false);
    }
  };

  // Render the message with user info, content, reply button, and nested replies
  return (
    <div className={`mb-4 ${depth > 0 ? 'ml-6' : ''}`}>
      <div className="flex items-start space-x-3">
        <Avatar>
          <AvatarImage src={message.user.profileImage} alt={message.user.username} />
          <AvatarFallback>{message.user.username[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center">
            <span className="font-semibold">{message.user.username}</span>
            <span className="ml-2 text-sm text-gray-500">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-1">{message.content}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReplying(!isReplying)}
            className="mt-2"
          >
            Reply
          </Button>
        </div>
      </div>
      {isReplying && (
        <div className="mt-2 ml-12">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            className="mb-2"
          />
          <Button onClick={handleReply} size="sm">
            Send Reply
          </Button>
        </div>
      )}
      {message.replies && message.replies.length > 0 && (
        <div className="mt-4">
          {message.replies.map((reply) => (
            <MessageItem key={reply.id} message={reply} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

