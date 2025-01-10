import { useEffect } from 'react';
import { XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from './use-toast';

export function Toasts() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-2 rounded-lg p-4 shadow-lg transition-all",
            "animate-in slide-in-from-right",
            toast.variant === 'destructive' 
              ? "bg-destructive text-destructive-foreground"
              : "bg-background text-foreground"
          )}
        >
          {toast.variant === 'destructive' ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          <div className="flex flex-col">
            <div className="font-semibold">{toast.title}</div>
            {toast.description && (
              <div className="text-sm opacity-90">{toast.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 