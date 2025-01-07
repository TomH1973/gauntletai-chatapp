'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Message, Thread, User } from '../types';
import { socket } from '../lib/socket';

interface ChatMessage extends Message {
  sender: User;
}

interface ChatThread extends Thread {
  participants: User[];
  messages: ChatMessage[];
}

export default function ChatInterface() {
  const { user } = useUser();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (currentThread) {
      socket.on('new_message', (message: ChatMessage) => {
        if (message.threadId === currentThread.id) {
          setCurrentThread(prev => ({
            ...prev!,
            messages: [...prev!.messages, message]
          }));
        }
      });
    }
    return () => {
      socket.off('new_message');
    };
  }, [currentThread]);

  const fetchThreads = async () => {
    const response = await fetch('/api/threads');
    const data = await response.json();
    setThreads(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentThread || !message.trim()) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          threadId: currentThread.id
        }),
      });

      if (response.ok) {
        setMessage('');
        // Refresh thread messages
        const updatedThread = await fetch(`/api/threads/${currentThread.id}`).then(res => res.json());
        setCurrentThread(updatedThread);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Threads Sidebar */}
      <div className="w-1/4 border-r p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Conversations</h2>
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`p-3 cursor-pointer hover:bg-gray-100 rounded ${
              currentThread?.id === thread.id ? 'bg-gray-100' : ''
            }`}
            onClick={() => setCurrentThread(thread)}
          >
            <h3 className="font-semibold">{thread.title}</h3>
            <p className="text-sm text-gray-500">
              {thread.participants
                .filter(p => p.id !== user?.id)
                .map(p => p.username)
                .join(', ')}
            </p>
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentThread ? (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {currentThread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.sender.id === user?.id ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.sender.id === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    <p className="text-sm font-semibold">{message.sender.username}</p>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
} 