import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { format } from 'date-fns';

const ChatWindow = ({ onLogout, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch message history
    const fetchMessages = async () => {
      try {
        const response = await axios.get('/api/messages');
        
        if (response.data.status === 'success') {
          setMessages(response.data.data);
        } else {
          throw new Error('Failed to fetch messages');
        }
      } catch (error) {
        setError('Error fetching message history');
        console.error('Error fetching messages:', error);
      }
    };

    // Connect to Socket.IO
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      auth: {
        token: session.token
      }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO');
      setIsConnected(true);
      setError('');
    });

    socketRef.current.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('error', (error) => {
      setError(error.message);
    });

    socketRef.current.on('connect_error', (error) => {
      setError('Connection error. Please try again.');
      setIsConnected(false);
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      setError('Disconnected from server');
    });

    fetchMessages();

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    socketRef.current.emit('message', newMessage);
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">
              Chat App
            </h1>
            <div className="ml-3 text-sm">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <div className="flex items-center">
            <span className="mr-4 text-sm text-gray-600">
              Signed in as <span className="font-medium">{user.username}</span>
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.isAI ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isAI
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <div className="font-medium text-xs mb-1">
                  {message.user?.username || 'Unknown'}
                  <span className="ml-2 text-opacity-75">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div className="break-words">{message.text}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Message input */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border-t border-gray-200 p-4"
      >
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow; 