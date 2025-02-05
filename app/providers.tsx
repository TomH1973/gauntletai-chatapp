'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSessionManager } from '@/lib/auth/session';

// Enhanced error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto my-8">
      <div className="flex items-center justify-between">
        <h2 className="text-red-800 font-semibold text-lg">Something went wrong</h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-red-600 hover:text-red-700 text-sm underline"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>
      
      <p className="mt-2 text-red-700">{error.message}</p>
      
      {showDetails && (
        <div className="mt-4 p-3 bg-red-100 rounded text-sm font-mono overflow-auto">
          <p className="text-red-800">Error Stack:</p>
          <pre className="mt-1 text-red-700 text-xs">{error.stack}</pre>
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-white text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
        >
          Go to home page
        </button>
      </div>
    </div>
  );
}

function DebugComponent({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Enhanced debug logging with more environment checks
    const env = {
      domain: process.env.NEXT_PUBLIC_CLERK_DOMAIN,
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8) + '...',
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      browserInfo: {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        onLine: window.navigator.onLine,
      },
      screenInfo: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio,
      }
    };

    console.log('Environment Check:', env);

    // Log any missing critical vars with severity levels
    Object.entries(env).forEach(([key, value]) => {
      if (!value) {
        console.error(`[CRITICAL] Missing environment variable: ${key}`);
      }
    });

    // Add online/offline event listeners
    const handleOnline = () => console.log('🟢 Application is online');
    const handleOffline = () => console.warn('🔴 Application is offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount: number, error: Error) => {
          // Don't retry on 404s or auth errors
          const status = (error as any)?.response?.status;
          if (status === 404 || status === 401) {
            return false;
          }
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
        staleTime: 30000,
      },
      mutations: {
        retry: false
      }
    },
    queryCache: new QueryCache({
      onError: (error: unknown, query) => {
        console.error('Query Cache Error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          queryKey: query.queryKey,
          timestamp: new Date().toISOString(),
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: unknown) => {
        console.error('Mutation Cache Error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
      },
    }),
  }));

  const [mounted, setMounted] = useState(false);
  const sessionManager = useSessionManager();

  useEffect(() => {
    setMounted(true);
    // Setup token refresh on mount
    sessionManager.setupTokenRefresh();
    
    // Update activity on user interaction
    const updateActivity = () => sessionManager.updateActivity();
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, [sessionManager]);

  // Wait for client-side hydration to complete
  if (!mounted) {
    return null;
  }

  if (typeof window !== 'undefined') {
    console.log('Clerk initialization check:', {
      domain: process.env.NEXT_PUBLIC_CLERK_DOMAIN,
      key: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8)
    });
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        // Enhanced error logging
        const errorInfo = {
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: window.navigator.userAgent,
        };
        
        console.error('Application Error:', errorInfo);
        
        // Here you could send to your error tracking service
        // e.g., Sentry, LogRocket, etc.
      }}
      onReset={() => {
        // Clear any error-related state/cache
        queryClient.clear();
        // Reload the page
        window.location.reload();
      }}
    >
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        appearance={{
          elements: {
            formButtonPrimary: 'bg-blue-500 hover:bg-blue-600 text-sm normal-case',
            footerActionLink: 'text-blue-500 hover:text-blue-600',
            card: 'bg-white dark:bg-gray-800 shadow-xl'
          }
        }}
        navigate={(to) => {
          console.log('Navigation:', { to, from: window.location.pathname });
          window.location.href = to;
        }}
      >
        <QueryClientProvider client={queryClient}>
          <DebugComponent>
            {children}
          </DebugComponent>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
} 