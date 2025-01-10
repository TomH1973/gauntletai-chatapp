'use client';

import { ErrorInfo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useToast } from '@/hooks/useToast';

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ChatErrorBoundary({ children, fallback }: ChatErrorBoundaryProps) {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to your error reporting service
    console.error('Chat component error:', error, errorInfo);

    // Show user-friendly toast
    toast({
      title: 'Chat Error',
      description: 'There was a problem with the chat component. Please try refreshing the page.',
      variant: 'destructive',
    });
  };

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
} 