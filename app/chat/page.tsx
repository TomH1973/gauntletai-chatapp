'use client';

import { ChatErrorBoundary } from '@/components/error/ChatErrorBoundary';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <ChatErrorBoundary>
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </ChatErrorBoundary>
  );
} 