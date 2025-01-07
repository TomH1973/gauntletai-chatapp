import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '../types';
import { socket } from '../lib/socket';

interface MessageListProps {
  threadId: string;
  currentUser: { id: string; username: string; };
}

export function MessageList({ threadId, currentUser }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageMapRef = useRef<Map<string, Message>>(new Map());

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const tempId = `temp-${Date.now()}`;
      
      // If this is a server message replacing a temp message, remove the temp
      if (!message.id.startsWith('temp-')) {
        const index = newMessages.findIndex(m => m.id === tempId);
        if (index !== -1) {
          newMessages.splice(index, 1);
        }
      }
      
      // Add the new message
      newMessages.push(message);
      messageMapRef.current.set(message.id, message);
      
      return newMessages;
    });

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    setMessages([]); // Clear messages when thread changes
    messageMapRef.current.clear(); // Clear message map
    setIsLoading(true);
    fetchMessages();

    socket.emit('join_room', threadId);
    
    const handleNewMessage = (message: Message) => {
      if (message.threadId === threadId && message.userId !== currentUser.id) {
        addMessage(message);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.emit('leave_room', threadId);
    };
  }, [threadId, currentUser.id, addMessage]);

  async function fetchMessages() {
    try {
      const response = await fetch(`/api/messages?threadId=${threadId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const { data } = await response.json();
      const sortedMessages = data.reverse();
      setMessages(sortedMessages);
      
      // Update message map
      messageMapRef.current.clear();
      sortedMessages.forEach((message: Message) => {
        messageMapRef.current.set(message.id, message);
      });

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="flex-1 overflow-y-auto p-4">Loading messages...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`flex flex-col ${
                message.userId === currentUser.id ? 'items-end' : 'items-start'
              }`}
            >
              <div className={`flex items-start gap-2 ${
                message.userId === currentUser.id ? 'flex-row-reverse' : 'flex-row'
              }`}>
                <div className="font-medium">{message.user.username}</div>
                <div className="text-sm text-gray-500">
                  {new Date(message.createdAt).toLocaleString()}
                </div>
              </div>
              <div className={`mt-1 px-4 py-2 rounded-lg ${
                message.userId === currentUser.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100'
              }`}>
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
} 