'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bold, Italic, List, Code, Link } from 'lucide-react';
import { useMention } from '@/hooks/useMention';
import { MentionList } from './MentionList';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * @component RichTextEditor
 * @description A rich text editor component with markdown and @mention support
 */
export function RichTextEditor({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  className
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);

  const {
    searchTerm,
    selectedIndex,
    users,
    isSearching,
    handleKeyDown: handleMentionKeyDown,
    handleSelect,
    resetSearch
  } = useMention({
    onMention: (user) => {
      const content = editorRef.current?.innerText || '';
      const lastAtIndex = content.lastIndexOf('@');
      if (lastAtIndex === -1) return;

      const newContent = content.slice(0, lastAtIndex) + `@${user.username} ` + content.slice(lastAtIndex + searchTerm.length + 1);
      onChange(newContent);
      
      // Set cursor position after the mention
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(editorRef.current!.firstChild!, lastAtIndex + user.username.length + 2);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });

  const handleFormat = (format: string) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'list':
        formattedText = `\n- ${selectedText}`;
        break;
      case 'code':
        formattedText = selectedText.includes('\n')
          ? `\n\`\`\`\n${selectedText}\n\`\`\`\n`
          : `\`${selectedText}\``;
        break;
      case 'link':
        formattedText = `[${selectedText}](url)`;
        break;
    }

    const content = editorRef.current.innerText;
    const start = range.startOffset;
    const end = range.endOffset;
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    onChange(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSearching) {
      handleMentionKeyDown(e);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }

    if (e.key === '@') {
      const selection = window.getSelection();
      if (!selection) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();

      if (editorRect) {
        setCursorPosition({
          top: rect.bottom - editorRect.top,
          left: rect.left - editorRect.left
        });
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerText;
    onChange(content);

    // Check for @mention
    const lastAtIndex = content.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = content.slice(lastAtIndex + 1);
      const match = textAfterAt.match(/^[\w\d]+/);
      if (match) {
        const searchTerm = match[0];
        // TODO: Implement mention search
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('bold')}
          disabled={disabled}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('italic')}
          disabled={disabled}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('list')}
          disabled={disabled}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('code')}
          disabled={disabled}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('link')}
          disabled={disabled}
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className={cn(
            "min-h-[80px] max-h-[300px] p-3 overflow-auto rounded-md border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "before:content-[attr(data-placeholder)] before:text-muted-foreground empty:before:inline-block",
            isFocused && "ring-1 ring-ring",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        />

        {isSearching && cursorPosition && (
          <MentionList
            users={users}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            className={cn(
              "absolute",
              `top-[${cursorPosition.top}px] left-[${cursorPosition.left}px]`
            )}
          />
        )}
      </div>
    </div>
  );
} 