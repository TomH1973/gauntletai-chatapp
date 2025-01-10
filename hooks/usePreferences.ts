'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  shareProfile: boolean;
  showOnlineStatus: boolean;
  allowMessagePreviews: boolean;
  retainMessageHistory: boolean;
  notificationSound: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  language: string;
  timezone: string;
}

/**
 * @hook usePreferences
 * @description Custom hook for managing user preferences with persistence
 * 
 * Features:
 * - Automatic preference loading
 * - Preference updates with API sync
 * - Loading and error state management
 * - Type-safe preference handling
 * 
 * @returns {Object} Preferences state and utilities
 * @property {UserPreferences | null} preferences - Current preferences
 * @property {boolean} isLoading - Whether preferences are loading
 * @property {string | null} error - Any error that occurred
 * @property {(updates: Partial<UserPreferences>) => Promise<void>} updatePreferences - Function to update preferences
 * 
 * @example
 * ```tsx
 * const { preferences, isLoading, error, updatePreferences } = usePreferences();
 * 
 * // Update a preference
 * await updatePreferences({ theme: 'dark' });
 * ```
 */
export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        if (!response.ok) {
          throw new Error('Failed to fetch preferences');
        }
        const data = await response.json();
        setPreferences(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const updatedPreferences = await response.json();
      setPreferences(updatedPreferences);
      setError(null);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
  };
} 