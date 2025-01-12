'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';

interface User {
  id: string;
  username: string;
  profileImage?: string;
}

interface UseMentionOptions {
  onMention?: (user: User) => void;
}

interface UseMentionResult {
  searchTerm: string;
  selectedIndex: number;
  users: User[];
  isSearching: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSelect: (user: User) => void;
  resetSearch: () => void;
}

/**
 * @hook useMention
 * @description Custom hook for managing @mentions in text input
 */
export function useMention({ onMention }: UseMentionOptions = {}): UseMentionResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    async function searchUsers() {
      if (!debouncedSearch) {
        setUsers([]);
        return;
      }

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error('Failed to search users:', error);
        setUsers([]);
      }
    }

    searchUsers();
  }, [debouncedSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isSearching) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % users.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
        break;
      case 'Enter':
      case 'Tab':
        if (users.length > 0) {
          e.preventDefault();
          handleSelect(users[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        resetSearch();
        break;
    }
  }, [isSearching, users, selectedIndex]);

  const handleSelect = useCallback((user: User) => {
    onMention?.(user);
    resetSearch();
  }, [onMention]);

  const resetSearch = useCallback(() => {
    setSearchTerm('');
    setSelectedIndex(0);
    setUsers([]);
    setIsSearching(false);
  }, []);

  return {
    searchTerm,
    selectedIndex,
    users,
    isSearching,
    handleKeyDown,
    handleSelect,
    resetSearch,
  };
} 