'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      
      {error && (
        <div className="max-w-md p-4 bg-red-50 rounded-md text-sm text-red-600">
          {error.message}
        </div>
      )}

      {resetErrorBoundary && (
        <Button
          onClick={resetErrorBoundary}
          className="mt-4 inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  );
} 