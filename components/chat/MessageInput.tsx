'use client';

import { useSocket } from '@/hooks/useSocket';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { useState } from 'react';
import { Button } from '../ui/button';
import { RichTextEditor } from './RichTextEditor';

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  threadId?: string;
}

export function MessageInput({ 
  onSendMessage, 
  onStartTyping, 
  onStopTyping, 
  disabled = false,
  threadId 
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const { socket } = useSocket();
  const { isOnline, queueMessage } = useOfflineSupport();

  const handleSend = async () => {
    if (!content.trim() || disabled) return;

    await onSendMessage(content, []);
    setContent('');
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <RichTextEditor
          value={content}
          onChange={setContent}
          onFocus={onStartTyping}
          onBlur={onStopTyping}
          placeholder="Type a message..."
          className="flex-1"
          disabled={disabled}
        />
        <Button 
          onClick={handleSend}
          size="icon"
          className="self-end"
          disabled={disabled || !content.trim()}
        >
          Send
        </Button>
      </div>
      {!isOnline && (
        <p className="mt-2 text-xs text-muted-foreground">
          You're offline. Messages will be sent when you're back online.
        </p>
      )}
    </div>
  );
} 