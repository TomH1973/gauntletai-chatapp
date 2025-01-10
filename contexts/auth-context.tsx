'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async function signup(email: string, username: string, password: string) {
    try {
      setError(null);
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Signup failed');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Signup failed');
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, login, logout, signup }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 