import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageEdit } from '@/types/chat';
import { format } from 'date-fns';

interface MessageEditHistoryProps {
  messageId: string;
  edits: MessageEdit[];
}

export function MessageEditHistory({ messageId, edits }: MessageEditHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!edits || edits.length === 0) return null;

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? 'Hide edits' : `Edited ${edits.length} ${edits.length === 1 ? 'time' : 'times'}`}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {edits.map((edit) => (
            <div key={edit.id} className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {format(new Date(edit.editedAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <div className="mt-1 rounded bg-muted/50 p-2">
                {edit.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 