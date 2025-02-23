import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import Login from './components/Login';
import ChatWindow from './components/ChatWindow';

const App = () => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Check for existing token and try to authenticate
    const token = localStorage.getItem('token');
    if (token) {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4001';
      axios.get(`${apiUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      })
        .then(response => {
          setUser(response.data);
          initializeSocket(token);
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  const initializeSocket = (token) => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4001';
    const newSocket = io(apiUrl, {
      auth: { token },
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication error') {
        handleLogout();
      }
    });

    setSocket(newSocket);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    initializeSocket(localStorage.getItem('token'));
  };

  const handleLogout = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4001';
    try {
      await axios.post(`${apiUrl}/api/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('token');
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {user ? (
        <div className="flex flex-col h-screen">
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Welcome, {user.username}
                  </span>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={handleLogout}
                    className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
          <div className="flex-grow">
            {socket && <ChatWindow socket={socket} user={user} />}
          </div>
        </div>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App; 