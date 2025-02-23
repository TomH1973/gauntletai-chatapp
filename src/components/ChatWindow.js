import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { format } from 'date-fns';

const ChatWindow = ({ onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch message history
    const fetchMessages = async () => {
      try {
        const response = await axios.get('/api/messages', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setMessages(response.data);
      } catch (error) {
        setError('Error fetching message history');
        console.error('Error fetching messages:', error);
      }
    };

    // Connect to Socket.IO
    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO');
    });

    socketRef.current.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('error', (error) => {
      setError(error.message);
    });

    socketRef.current.on('connect_error', (error) => {
      setError('Connection error. Please try again.');
      console.error('Socket connection error:', error);
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

    socketRef.current.emit('message', { text: newMessage });
    setNewMessage('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    onLogout();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">
            Chat App
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.aiGenerated ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.aiGenerated
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-blue-600 text-white'
              }`}
            >
              <div className="font-medium text-xs mb-1">
                {message.userId.username}
                <span className="ml-2 text-opacity-75">
                  {format(new Date(message.timestamp), 'HH:mm')}
                </span>
              </div>
              <div className="break-words">{message.text}</div>
            </div>
          </div>
        ))}
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
            disabled={!newMessage.trim()}
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