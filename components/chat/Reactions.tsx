import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { useMessageReactions } from '@/hooks/useMessageReactions';

interface ReactionsProps {
  messageId: string;
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export function Reactions({ messageId }: ReactionsProps) {
  const { reactions, addReaction, removeReaction } = useMessageReactions({ messageId });

  const handleReaction = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      removeReaction(emoji);
    } else {
      addReaction(emoji);
    }
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
          <span>{reaction.count}</span>
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