'use client';

import { createContext, useContext } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';

interface AuthContextType {
  userId: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isLoading: true,
  isSignedIn: false,
});

/**
 * @stateflow Authentication State Management
 * 
 * 1. Initial Load
 *    - Check for existing session
 *    - Load user data if session exists
 *    - Set initial loading state
 * 
 * 2. Authentication States
 *    - Not Loaded: { user: null, isLoading: true }
 *    - Authenticated: { user: User, isLoading: false }
 *    - Unauthenticated: { user: null, isLoading: false }
 *    - Error: { user: null, error: string }
 * 
 * 3. State Transitions
 *    - Login: NOT_LOADED -> LOADING -> AUTHENTICATED/ERROR
 *    - Signup: NOT_LOADED -> LOADING -> AUTHENTICATED/ERROR
 *    - Logout: AUTHENTICATED -> NOT_LOADED
 *    - Session Expiry: AUTHENTICATED -> NOT_LOADED
 * 
 * 4. Error Handling
 *    - Network errors during auth
 *    - Invalid credentials
 *    - Session validation failures
 * 
 * 5. Side Effects
 *    - Local storage updates
 *    - API synchronization
 *    - UI updates
 */

/**
 * @errorflow Authentication Error Handling
 * 
 * 1. Initial Load Errors
 *    Path: checkAuth()
 *    - Network failure -> Log error -> Set loading false
 *    - Invalid session -> Clear user -> Set loading false
 *    - Server error -> Log error -> Set loading false
 * 
 * 2. Login Errors
 *    Path: login()
 *    - Invalid credentials -> Set error message -> Throw error
 *    - Network failure -> Set error message -> Throw error
 *    - Server error -> Set error message -> Throw error
 * 
 * 3. Signup Errors
 *    Path: signup()
 *    - Duplicate email -> Set error message -> Throw error
 *    - Invalid data -> Set error message -> Throw error
 *    - Network failure -> Set error message -> Throw error
 * 
 * 4. Logout Errors
 *    Path: logout()
 *    - Network failure -> Log error -> Clear user anyway
 *    - Server error -> Log error -> Clear user anyway
 * 
 * 5. Error Recovery
 *    - Clear error state on new auth attempts
 *    - Maintain user session on non-critical errors
 *    - Force re-authentication on critical errors
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded, isSignedIn } = useClerkAuth();

  return (
    <AuthContext.Provider
      value={{
        userId: userId || null,
        isLoading: !isLoaded,
        isSignedIn: isSignedIn || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 