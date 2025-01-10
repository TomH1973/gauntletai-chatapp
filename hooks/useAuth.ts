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

    // Transform Clerk user to our User type
    setUser({
      id: clerkUser.id,
      username: clerkUser.username || '',
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      imageUrl: clerkUser.imageUrl || '',
      createdAt: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: clerkUser.updatedAt?.toISOString() || new Date().toISOString(),
      lastLoginAt: clerkUser.lastSignInAt?.toISOString() || new Date().toISOString(),
      isActive: true
    });
  }, [clerkUser, isSignedIn, isLoaded]);

  return {
    user,
    isLoaded,
    isSignedIn,
    getToken: () => getToken(),
  };
} 