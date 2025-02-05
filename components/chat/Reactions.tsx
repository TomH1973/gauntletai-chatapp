import { MessageReaction } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

interface ReactionsProps {
  reactions: MessageReaction[];
  messageId: string;
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export function Reactions({ reactions, messageId }: ReactionsProps) {
  const socket = useSocket();

  const handleReaction = (emoji: string) => {
    socket?.emit('message:react', { messageId, emoji });
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {reactions.map((reaction) => (
        <Button
          key={`${reaction.emoji}`}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.users.length}</span>
        </Button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-2" align="start">
          <div className="grid grid-cols-6 gap-1">
            {commonEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 