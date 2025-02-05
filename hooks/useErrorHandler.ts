import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ErrorCode, ERROR_MESSAGES } from '@/lib/errors';

interface ErrorOptions {
  silent?: boolean;
  retry?: () => Promise<void>;
  fallback?: React.ReactNode;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(async (error: unknown, options: ErrorOptions = {}) => {
    // Extract error details
    const errorCode = error instanceof Error && 'code' in error 
      ? (error as { code: ErrorCode }).code 
      : ErrorCode.SERVER_ERROR;
    
    const errorDetails = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ErrorCode.SERVER_ERROR];

    // Log error for debugging
    console.error('Error handled:', {
      code: errorCode,
      error,
      details: errorDetails
    });

    // Show toast notification unless silent
    if (!options.silent) {
      toast({
        title: errorDetails.message,
        description: errorDetails.action,
        variant: 'destructive',
      });
    }

    // If retry function provided, show retry toast
    if (options.retry) {
      toast({
        title: 'Action Failed',
        description: 'Would you like to try again?',
        variant: 'destructive',
        action: {
          label: 'Retry',
          onClick: () => options.retry?.()
        },
      });
    }

    // Return error details for potential UI handling
    return {
      ...errorDetails,
      fallback: options.fallback
    };
  }, [toast]);

  const withErrorHandling = useCallback(async <T,>(
    operation: () => Promise<T>,
    options: ErrorOptions = {}
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      await handleError(error, options);
      throw error;
    }
  }, [handleError]);

  return {
    handleError,
    withErrorHandling
  };
} 