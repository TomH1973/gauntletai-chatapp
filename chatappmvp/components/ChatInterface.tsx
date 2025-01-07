"use client";

// This component handles the main chat interface, including message display and sending
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/useSocket";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { MessageItem } from "@/components/MessageItem";
import { fetchWithAuth } from "@/utils/api";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    profileImage: string;
  };
  replies?: Message[];
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const socket = useSocket();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message: Message) => {
        setMessages((prevMessages) => addMessageToThread(prevMessages, message));
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        toast({
          title: "Error",
          description: "An error occurred. Please try again.",
          variant: "destructive",
        });
      });
    }
  }, [socket, toast]);

  // Fetch initial messages
  const fetchMessages = async () => {
    try {
      const response = await fetchWithAuth('/api/messages?threadId=general');
      setMessages(response);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch messages. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (parentId: string | null = null) => {
    if (inputValue.trim() && user) {
      const newMessage = {
        content: inputValue,
        threadId: 'general',
        parentId,
      };

      try {
        const response = await fetchWithAuth('/api/messages', 'POST', newMessage);
        socket?.emit('send_message', response);
        setInputValue("");
        setMessages((prevMessages) => addMessageToThread(prevMessages, response));
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Recursively adds a new message to the thread, maintaining the nested structure of replies
  const addMessageToThread = (messages: Message[], newMessage: Message): Message[] => {
    if (!newMessage.parentId) {
      return [...messages, newMessage];
    }

    return messages.map((message) => {
      if (message.id === newMessage.parentId) {
        return {
          ...message,
          replies: [...(message.replies || []), newMessage],
        };
      }
      if (message.replies) {
        return {
          ...message,
          replies: addMessageToThread(message.replies, newMessage),
        };
      }
      return message;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onReply={(parentId, content) => {
              setInputValue(content);
              handleSendMessage(parentId);
            }}
          />
        ))}
      </ScrollArea>
      <div className="p-4 border-t flex">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow mr-2"
        />
        <Button onClick={() => handleSendMessage()}>Send</Button>
      </div>
    </div>
  );
}

