import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageReplyProps {
  parentId: string;
  onReply?: (parentId: string, content: string) => void;
}

export function MessageReply({ parentId, onReply }: MessageReplyProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !onReply) return;
    
    onReply(parentId, content.trim());
    setContent('');
    setIsReplying(false);
  };

  if (!isReplying) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsReplying(true)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Reply
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        className="min-h-[80px] resize-none"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!content.trim()}>
          Send
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsReplying(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
} 