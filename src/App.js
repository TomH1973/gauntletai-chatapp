import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ChatWindow from './components/ChatWindow';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedSession = localStorage.getItem('session');
    const lastActivity = localStorage.getItem('lastActivity');
    
    if (storedSession && lastActivity) {
      try {
        const sessionData = JSON.parse(storedSession);
        const lastActivityTime = parseInt(lastActivity, 10);
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Check if session is expired (1 day)
        if (Date.now() - lastActivityTime > oneDay) {
          handleLogout();
        } else {
          setSession(sessionData);
          setupAxiosInterceptors(sessionData.token);
        }
      } catch (error) {
        console.error('Error parsing session:', error);
        handleLogout();
      }
    }
    
    setIsLoading(false);
  }, []);

  // Update activity timestamp on user interaction
  useEffect(() => {
    if (!session) return;
    
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };
    
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [session]);

  const setupAxiosInterceptors = (token) => {
    // Add token to all requests
    axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle 401 responses (unauthorized)
    axios.interceptors.response.use(
      (response) => response, 
      (error) => {
        if (error.response && error.response.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
  };

  const handleLogin = (sessionData) => {
    setSession(sessionData);
    setupAxiosInterceptors(sessionData.token);
  };

  const handleLogout = () => {
    localStorage.removeItem('session');
    localStorage.removeItem('lastActivity');
    setSession(null);
    // Reset axios default headers
    delete axios.defaults.headers.common['Authorization'];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {session ? (
        <ChatWindow onLogout={handleLogout} user={session.user} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App; 