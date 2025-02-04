'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ui/use-toast';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Spinner } from '@/components/ui/spinner';
import { Message, Thread, User, MessageError } from '@/types/chat';
import { Socket } from 'socket.io-client';
import { useOptimisticMessages } from '@/hooks/useOptimisticMessages';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ErrorCode, ERROR_MESSAGES } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { Menu } from '@/components/icons/menu';
import { ThreadList } from './ThreadList';
import { useChat } from '@/hooks/useChat';

interface ChatInterfaceProps {
  threadId?: string;
  currentUser?: User;
  initialMessages?: Message[];
  users?: Record<string, User>;
}

export function ChatInterface({ threadId, currentUser, initialMessages = [], users = {} }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const { socket, isConnected } = useSocket();
  const { user } = useUser();
  const { toast } = useToast();
  const {
    messages: optimisticMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
    markMessageError,
    markMessageRetrying,
    removeMessage,
    updateMessageStatus
  } = useOptimisticMessages();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { 
    threads,
    currentThread,
    messages: chatMessages,
    isLoading: chatIsLoading,
    error: chatError,
    sendMessage,
    selectThread,
    createThread
  } = useChat();

  useEffect(() => {
    if (socket) {
      setIsConnecting(!isConnected);
      
      socket.on('connect_error', () => {
        setIsConnecting(true);
        toast({
          title: "Connection Error",
          description: "Failed to connect to chat server. Retrying...",
          variant: "destructive",
        });
      });

      socket.on('connect', () => {
        setIsConnecting(false);
      });

      socket.on('message:new', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      return () => {
        socket.off('connect_error');
        socket.off('connect');
        socket.off('message:new');
      };
    }
  }, [socket, isConnected, toast]);

  useEffect(() => {
    fetchMessages();
  }, [threadId]);

  const fetchMessages = async () => {
    if (!threadId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages?threadId=${threadId}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!user || !threadId) return;

    // Add optimistic message
    const tempId = addOptimisticMessage(content, user.id, threadId);

    try {
      // Send message to server
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          threadId,
          tempId // Send tempId to correlate the response
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const newMessage = await response.json();
      
      // Update optimistic message with real data
      updateOptimisticMessage(tempId, newMessage);
      
      // Emit to socket
      socket?.emit('message:send', { ...newMessage, tempId });

    } catch (error) {
      const messageError = error as MessageError;
      const errorCode = messageError.code as ErrorCode || ErrorCode.MESSAGE_SEND_FAILED;
      const errorDetails = ERROR_MESSAGES[errorCode];
      
      markMessageError(tempId, errorDetails.message);
      
      toast({
        title: errorDetails.message,
        description: errorDetails.action,
        variant: "destructive",
        action: {
          label: "Retry",
          onClick: () => {
            markMessageRetrying(tempId);
            handleSendMessage(content, attachments);
          }
        }
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full relative">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-20 p-2 rounded-md hover:bg-accent"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 transform md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-10",
        "w-80 bg-background border-r",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ThreadList
          threads={threads}
          currentUser={currentUser || { id: user?.id || '', name: user?.fullName || '', email: user?.emailAddresses[0]?.emailAddress || '' }}
          selectedThreadId={currentThread?.id}
          onThreadSelect={(threadId) => {
            const thread = threads.find(t => t.id === threadId);
            if (thread) {
              selectThread(thread);
              setIsSidebarOpen(false);
            }
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {isConnecting && (
          <div className="bg-yellow-100 dark:bg-yellow-900 p-2 text-center text-sm">
            Connecting to chat server...
          </div>
        )}
        
        {!threadId || !currentUser ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
            Select a conversation to start chatting
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              currentUser={currentUser}
              isLoading={isLoading}
            />
            
            <MessageInput
              onSendMessage={handleSendMessage}
              onStartTyping={() => socket?.emit('typing:start', threadId)}
              onStopTyping={() => socket?.emit('typing:stop', threadId)}
              disabled={isSending || isConnecting}
              threadId={threadId}
            />
          </>
        )}
      </div>
    </div>
  );
} 