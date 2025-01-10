'use client';

import { useEffect, useState } from 'react';
import { useClerk, useUser, useSession } from '@clerk/nextjs';
import type { User } from '@/types';

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