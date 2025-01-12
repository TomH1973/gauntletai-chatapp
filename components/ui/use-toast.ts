import { useState, useCallback } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: ToastAction;
}

interface ToastState extends Toast {
  id: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toast = useCallback(({ title, description, variant = 'default', action }: Toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, description, variant, action }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  return { toast, toasts };
} 