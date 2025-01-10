'use client';

import { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useTheme } from 'next-themes';

interface EmojiPickerProps {
  onSelectAction: (emoji: string) => void;
  onCloseAction: () => void;
}

export function EmojiPicker({ onSelectAction, onCloseAction }: EmojiPickerProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCloseAction();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCloseAction]);

  return (
    <div ref={containerRef} className="rounded-lg shadow-lg">
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => onSelectAction(emoji.native)}
        theme={theme === 'dark' ? 'dark' : 'light'}
        set="native"
        showPreview={false}
        showSkinTones={false}
        emojiSize={20}
        emojiButtonSize={28}
        maxFrequentRows={2}
      />
    </div>
  );
} 