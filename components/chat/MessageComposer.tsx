import { useState, useRef, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, PaperclipIcon } from 'lucide-react';
import { ErrorCode, ERROR_MESSAGES } from '@/lib/errors';
import { cn } from '@/lib/utils';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_ATTACHMENTS = 10;
const ALLOWED_FILE_TYPES = ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * @interface MessageComposerProps
 * @description Props for the MessageComposer component
 */
interface MessageComposerProps {
  /** ID of the thread this message belongs to */
  threadId: string;
  /** Callback function to handle message sending */
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  /** Whether the composer is disabled */
  disabled?: boolean;
  /** Message being replied to, if any */
  replyTo?: {
    id: string;
    content: string;
    author: string;
  } | null;
  /** Callback to cancel reply mode */
  onCancelReply?: () => void;
}

interface MessageError extends Error {
  code?: ErrorCode;
}

/**
 * @component MessageComposer
 * @description A rich text input component for composing messages with attachment support
 * 
 * @example
 * ```tsx
 * <MessageComposer
 *   threadId="123"
 *   onSendMessage={handleSend}
 *   disabled={false}
 * />
 * ```
 */
export function MessageComposer({
  threadId,
  onSendMessage,
  disabled = false,
  replyTo = null,
  onCancelReply
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();
  const { toast } = useToast();

  // Reset error when content changes
  useEffect(() => {
    if (error) setError(null);
  }, [content, error]);

  const validateMessage = () => {
    if (!content.trim() && attachments.length === 0) {
      setError('Message cannot be empty');
      return false;
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
      return false;
    }

    if (attachments.length > MAX_ATTACHMENTS) {
      setError(`Cannot attach more than ${MAX_ATTACHMENTS} files`);
      return false;
    }

    return true;
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const invalidFiles = files.filter(file => {
      const isValidType = ALLOWED_FILE_TYPES.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -2));
        }
        return file.type === type || file.name.endsWith(type);
      });
      return !isValidType || file.size > MAX_FILE_SIZE;
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: "Some files were not added due to invalid type or size",
        variant: "destructive"
      });
    }

    const validFiles = files.filter(file => !invalidFiles.includes(file));
    setAttachments(prev => [...prev, ...validFiles].slice(0, MAX_ATTACHMENTS));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMessage() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(content, attachments);
      setContent('');
      setAttachments([]);
      if (onCancelReply) onCancelReply();
    } catch (error) {
      const messageError = error as MessageError;
      const errorCode = messageError.code || ErrorCode.MESSAGE_SEND_FAILED;
      const errorDetails = ERROR_MESSAGES[errorCode];
      toast({
        title: errorDetails.message,
        description: errorDetails.action,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t space-y-4">
      {replyTo && (
        <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
          <div className="flex-1 text-sm">
            <p className="font-medium text-muted-foreground">
              Replying to {replyTo.author}
            </p>
            <p className="truncate">{replyTo.content}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
          >
            ×
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded bg-muted"
            >
              <span className="text-sm truncate max-w-[200px]">
                {file.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className={cn(
            "min-h-[80px] max-h-[300px] flex-1",
            error && "border-destructive"
          )}
          disabled={disabled || isSubmitting}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAttachmentClick}
            disabled={disabled || isSubmitting}
          >
            <PaperclipIcon className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isSubmitting || (!content.trim() && attachments.length === 0)}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES.join(',')}
        className="hidden"
        onChange={handleAttachmentChange}
        disabled={disabled || isSubmitting}
      />
    </form>
  );
} 