import { useCallback } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const toast = useCallback(({ 
    title, 
    description, 
    variant = 'default',
    duration = 5000 
  }: ToastOptions) => {
    // For now, we'll use a simple console.log
    // In a real app, you'd integrate with a toast library
    console.log(`[${variant.toUpperCase()}] ${title}${description ? `: ${description}` : ''}`);
  }, []);

  return { toast };
} 