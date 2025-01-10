'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

/**
 * @interface MessageInputProps
 * @description Props for the MessageInput component
 */
interface MessageInputProps {
  /** Callback function to handle message sending */
  onSendMessage: (content: string) => void;
  /** Callback function triggered when user starts typing */
  onStartTyping: () => void;
  /** Callback function triggered when user stops typing */
  onStopTyping: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * @component MessageInput
 * @description A text input component for composing and sending messages with typing indicators
 * 
 * Features:
 * - Real-time typing indicators
 * - Auto-focus after sending
 * - Enter to send (Shift+Enter for new line)
 * - Disabled state handling
 * 
 * @example
 * ```tsx
 * <MessageInput
 *   onSendMessage={handleSend}
 *   onStartTyping={handleStartTyping}
 *   onStopTyping={handleStopTyping}
 *   disabled={false}
 * />
 * ```
 */
export function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isTyping) {
      onStartTyping();
    } else {
      onStopTyping();
    }
  }, [isTyping, onStartTyping, onStopTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsTyping(true);

    // Reset typing status after 3 seconds of no input
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 3000);

    return () => clearTimeout(timer);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled) return;

    onSendMessage(trimmedContent);
    setContent('');
    setIsTyping(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[60px] max-h-[200px]"
          disabled={disabled}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 