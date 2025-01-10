'use client';

import { useEffect, useState } from 'react';
import { useClerk, useUser, useSession } from '@clerk/nextjs';
import type { User } from '@/types';

/**
 * @hook useAuth
 * @description Custom hook for managing authentication state and user data
 * 
 * Features:
 * - Clerk authentication integration
 * - Local user data synchronization
 * - Token management
 * - Loading state handling
 * 
 * @returns {Object} Authentication state and utilities
 * @property {User | null} user - Current user data
 * @property {boolean} isLoaded - Whether auth state has loaded
 * @property {boolean} isSignedIn - Whether user is signed in
 * @property {() => Promise<string>} getToken - Function to get auth token
 * 
 * @example
 * ```tsx
 * const { user, isLoaded, isSignedIn, getToken } = useAuth();
 * 
 * if (!isLoaded) return <Loading />;
 * if (!isSignedIn) return <SignIn />;
 * ```
 */
export function useAuth() {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { session } = useSession();
  const [user, setUser] = useState<User | null>(null);

  const getToken = async () => {
    return session?.getToken();
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) {
      setUser(null);
      return;
    }

    // Fetch our local user data using Clerk ID
    const fetchLocalUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (!response.ok) {
          console.error('Failed to fetch local user data');
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching local user:', error);
        return null;
      }
    };

    fetchLocalUser().then((localUser) => {
      if (localUser) {
        setUser(localUser);
      } else {
        // Fallback to Clerk user data if local user not found
        setUser({
          id: localUser?.id,
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: clerkUser.firstName && clerkUser.lastName 
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.firstName || clerkUser.lastName || '',
          image: clerkUser.imageUrl || '',
          createdAt: localUser?.createdAt || new Date().toISOString(),
          updatedAt: localUser?.updatedAt || new Date().toISOString(),
          lastLoginAt: localUser?.lastLoginAt || new Date().toISOString(),
          isActive: true
        });
      }
    });
  }, [clerkUser, isSignedIn, isLoaded]);

  return {
    user,
    isLoaded,
    isSignedIn,
    getToken,
  };
} 