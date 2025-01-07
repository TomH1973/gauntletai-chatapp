'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Thread, User, Message } from '../../types';
import { MessageList } from '../../components/message-list';
import { MessageInput } from '../../components/message-input';
import { CreateThread } from '../../components/create-thread';
import { useAuth } from '../../contexts/auth-context';

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showNewThread, setShowNewThread] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchThreads();
    fetchUsers();
  }, [user, router]);

  async function fetchThreads() {
    try {
      const response = await fetch('/api/threads');
      if (!response.ok) throw new Error('Failed to fetch threads');
      const data = await response.json();
      setThreads(data);
    } catch (error) {
      console.error('Error fetching threads:', error);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  function handleThreadCreated(threadId: string) {
    fetchThreads();
    setShowNewThread(false);
  }

  const addMessage = useCallback((message: Message) => {
    // Optionally refresh thread list to update last message
    fetchThreads();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <button
            onClick={() => setShowNewThread(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            New Chat
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => setCurrentThread(thread)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                currentThread?.id === thread.id ? 'bg-blue-50' : ''
              }`}
            >
              <h3 className="font-medium">{thread.title || 'Untitled'}</h3>
              <p className="text-sm text-gray-500">
                {thread.participants.map(p => p.username).join(', ')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentThread && user ? (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="text-xl font-bold">{currentThread.title || 'Untitled'}</h2>
              <p className="text-sm text-gray-500">
                {currentThread.participants.map(p => p.username).join(', ')}
              </p>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <MessageList 
                threadId={currentThread.id} 
                currentUser={{ id: user.id, username: user.username }}
              />
            </div>
            
            <MessageInput 
              threadId={currentThread.id}
              currentUser={{ id: user.id, username: user.username }}
              onMessageSent={addMessage}
            />
          </>
        ) : showNewThread ? (
          <div className="p-4">
            <CreateThread 
              availableUsers={users} 
              onThreadCreated={handleThreadCreated} 
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation or start a new one
          </div>
        )}
      </div>
    </div>
  );
} 