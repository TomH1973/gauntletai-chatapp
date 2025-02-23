import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MessageReaction, MessageAttachment, User } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Smile, Paperclip, Download, AlertCircle } from 'lucide-react';
import { bytesToSize } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface MessageProps {
  id: string;
  content: string;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  attachments?: MessageAttachment[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  isHighlighted?: boolean;
  onReactionAdd?: (messageId: string, emoji: string) => void;
  onReactionRemove?: (messageId: string, emoji: string) => void;
  onAttachmentDownload?: (attachment: MessageAttachment) => void;
}

const REACTION_TYPES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

async function checkRateLimit(action: string) {
  const response = await fetch('/api/rate-limit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });
  
  if (!response.ok) {
    throw new Error('Rate limit check failed');
  }
  
  return response.json();
}

export function Message({
  id,
  content,
  createdAt,
  user,
  reactions = [],
  attachments = [],
  currentUser,
  isHighlighted,
  onReactionAdd,
  onReactionRemove,
  onAttachmentDownload
}: MessageProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [remainingReactions, setRemainingReactions] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkReactionLimit = async () => {
      try {
        const { allowed, remaining } = await checkRateLimit('reaction:add');
        setRemainingReactions(remaining);
      } catch (error) {
        console.error('Failed to check rate limit:', error);
        setRemainingReactions(null);
      }
    };
    checkReactionLimit();
  }, [currentUser.id, reactions]);

  const handleReactionClick = async (emoji: string) => {
    const existingReaction = reactions.find(
      r => r.users.includes(currentUser.id) && r.emoji === emoji
    );

    try {
      if (existingReaction) {
        const { allowed, retryAfter } = await checkRateLimit('reaction:remove');
        if (!allowed) {
          toast({
            title: 'Rate limit exceeded',
            description: `Please wait ${Math.ceil(retryAfter! / 60)} minutes before removing more reactions.`,
            variant: 'destructive'
          });
          return;
        }
        onReactionRemove?.(id, emoji);
      } else {
        const { allowed, retryAfter } = await checkRateLimit('reaction:add');
        if (!allowed) {
          toast({
            title: 'Rate limit exceeded',
            description: `Please wait ${Math.ceil(retryAfter! / 60)} minutes before adding more reactions.`,
            variant: 'destructive'
          });
          return;
        }
        onReactionAdd?.(id, emoji);
      }
      setShowReactionPicker(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process reaction. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAttachmentDownload = async (attachment: MessageAttachment) => {
    try {
      const { allowed, retryAfter } = await checkRateLimit('file:upload');
      if (!allowed) {
        toast({
          title: 'Rate limit exceeded',
          description: `Please wait ${Math.ceil(retryAfter! / 60)} minutes before downloading more files.`,
          variant: 'destructive'
        });
        return;
      }
      onAttachmentDownload?.(attachment);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download attachment. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = reaction;
    }
    return acc;
  }, {} as Record<string, MessageReaction>);

  if (!user) return null;

  return (
    <div
      className={cn(
        'group relative flex gap-3 py-2 transition-colors',
        isHighlighted && 'bg-accent/50 -mx-4 px-4 rounded-lg'
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={user.image || '/default-avatar.png'} alt={user.name} />
        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {user.id === currentUser.id ? 'You' : user.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(createdAt), 'p')}
          </span>
        </div>

        <div className="text-sm">{content}</div>

        {attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-md border p-2"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 truncate">
                  <div className="text-sm font-medium">{attachment.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {bytesToSize(attachment.size)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAttachmentDownload(attachment)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {Object.entries(groupedReactions).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(groupedReactions).map(([emoji, reaction]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={cn(
                  'flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs transition-colors hover:bg-muted/80',
                  reaction.users.includes(currentUser.id) &&
                    'bg-primary/10 hover:bg-primary/20'
                )}
              >
                <span>{emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="absolute right-0 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-1">
            {remainingReactions !== null && remainingReactions < 5 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{remainingReactions} reactions remaining</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              disabled={remainingReactions === 0}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showReactionPicker && (
          <div className="absolute right-0 top-10 z-10 rounded-lg border bg-background p-2 shadow-lg">
            <div className="flex gap-1">
              {REACTION_TYPES.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className="rounded p-1 text-lg hover:bg-accent"
                  disabled={remainingReactions === 0}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {remainingReactions === 0 && (
              <div className="text-xs text-muted-foreground mt-1 text-center">
                Rate limit reached
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}