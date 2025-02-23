import { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  token: string | null;
  user: {
    id: string;
    username: string;
    email: string;
  } | null;
  lastActivity?: number;
  refreshToken?: string;
}

const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSessionManager() {
  const [session, setSession] = useState<Session>({
    token: null,
    user: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const updateActivity = () => {
    setSession(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
    localStorage.setItem('lastActivity', Date.now().toString());
  };

  const refreshToken = async () => {
    try {
      if (!session.token) return;

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        }
      );

      if (response.data.token) {
        setSession(prev => ({
          ...prev,
          token: response.data.token,
          lastActivity: Date.now()
        }));
        localStorage.setItem('session', JSON.stringify({
          ...session,
          token: response.data.token,
          lastActivity: Date.now()
        }));
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, log out the user
      logout();
    }
  };

  const setupTokenRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    const interval = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
    setRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  };

  useEffect(() => {
    // Try to load session from localStorage on mount
    const storedSession = localStorage.getItem('session');
    const lastActivity = localStorage.getItem('lastActivity');

    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        
        // Check if session has expired due to inactivity
        if (lastActivity && Date.now() - parseInt(lastActivity) > ACTIVITY_TIMEOUT) {
          logout();
        } else {
          setSession(parsedSession);
          updateActivity();
        }
      } catch (e) {
        console.error('Failed to parse stored session:', e);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const login = (token: string, user: Session['user'], refreshToken?: string) => {
    const newSession = { 
      token, 
      user, 
      refreshToken,
      lastActivity: Date.now() 
    };
    setSession(newSession);
    localStorage.setItem('session', JSON.stringify(newSession));
    localStorage.setItem('lastActivity', Date.now().toString());
    setupTokenRefresh();
  };

  const logout = () => {
    setSession({ token: null, user: null });
    localStorage.removeItem('session');
    localStorage.removeItem('lastActivity');
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  return {
    session,
    loading,
    login,
    logout,
    isAuthenticated: !!session.token && !!session.user,
    updateActivity,
    setupTokenRefresh,
  };
} 