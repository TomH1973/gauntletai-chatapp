import { useState, FormEvent } from 'react';
import { socket } from '../lib/socket';
import { Message } from '../types';

interface MessageInputProps {
  threadId: string;
  onMessageSent?: (message: Message) => void;
  currentUser: { id: string; username: string; };
}

export function MessageInput({ threadId, onMessageSent, currentUser }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      threadId,
      userId: currentUser.id,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        email: '',
        firstName: null,
        lastName: null,
        profileImage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
        isActive: true
      },
      thread: {
        id: threadId,
        title: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: []
      },
      parentId: null,
      replies: []
    };

    // Optimistically update UI
    onMessageSent?.(optimisticMessage);
    setContent(''); // Clear input immediately

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: optimisticMessage.content,
          threadId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { data: message } = await response.json();
      socket.emit('send_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
} 