import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
}

interface Session {
  token: string | null;
  user: User | null;
  lastActivity?: number;
}

export function useSessionManager() {
  const [session, setSession] = useState<Session>({ token: null, user: null });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const updateActivity = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    setSession(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
    window.localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  const refreshToken = async () => {
    if (!session.token) return;

    try {
      const response = await axios.post('/api/auth/refresh', null, {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      if (response.data.token) {
        setSession(prev => ({
          ...prev,
          token: response.data.token,
          lastActivity: Date.now()
        }));
        window.localStorage.setItem('session', JSON.stringify({
          ...session,
          token: response.data.token,
          lastActivity: Date.now()
        }));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try to load session from localStorage on mount
    const storedSession = window.localStorage.getItem('session');
    const lastActivity = window.localStorage.getItem('lastActivity');

    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        setSession(parsedSession);

        // Check if session is expired (30 minutes)
        if (lastActivity) {
          const lastActivityTime = parseInt(lastActivity, 10);
          const thirtyMinutes = 30 * 60 * 1000;
          
          if (Date.now() - lastActivityTime > thirtyMinutes) {
            logout();
            return;
          }
        }
      } catch (error) {
        console.error('Failed to parse stored session:', error);
        logout();
      }
    }
  }, []);

  const setupTokenRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Refresh token every 25 minutes
    const interval = setInterval(refreshToken, 25 * 60 * 1000);
    setRefreshInterval(interval);

    return () => {
      clearInterval(interval);
      setRefreshInterval(null);
    };
  }, [refreshInterval]);

  const login = (token: string, user: User) => {
    const newSession = {
      token,
      user,
      lastActivity: Date.now()
    };
    setSession(newSession);
    window.localStorage.setItem('session', JSON.stringify(newSession));
    window.localStorage.setItem('lastActivity', Date.now().toString());
    setupTokenRefresh();
  };

  const logout = () => {
    setSession({ token: null, user: null });
    window.localStorage.removeItem('session');
    window.localStorage.removeItem('lastActivity');
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  return {
    session,
    login,
    logout,
    updateActivity,
    setupTokenRefresh
  };
} 