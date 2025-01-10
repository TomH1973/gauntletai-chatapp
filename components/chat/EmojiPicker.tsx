'use client';

import { useCallback, useEffect, useRef } from 'react';
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

  const handleSelect = useCallback((data: any) => {
    onSelectAction(data.native);
  }, [onSelectAction]);

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
    <div ref={containerRef} className="absolute z-50 shadow-lg rounded-lg">
      <Picker
        data={data}
        onEmojiSelect={handleSelect}
        theme={theme === 'dark' ? 'dark' : 'light'}
        previewPosition="none"
        skinTonePosition="none"
        searchPosition="none"
        navPosition="none"
        perLine={8}
        maxFrequentRows={1}
      />
    </div>
  );
} 