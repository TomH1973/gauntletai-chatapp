'use client';

import { MessageStatus as Status } from '@/types';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageStatusProps {
  status: Status;
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  return (
    <div className={cn("flex items-center text-muted-foreground", className)}>
      {status === Status.SENDING && (
        <Clock className="h-3 w-3 animate-pulse" />
      )}
      {status === Status.SENT && (
        <Check className="h-3 w-3" />
      )}
      {status === Status.DELIVERED && (
        <CheckCheck className="h-3 w-3" />
      )}
      {status === Status.READ && (
        <CheckCheck className="h-3 w-3 text-blue-500" />
      )}
      {status === Status.FAILED && (
        <AlertCircle className="h-3 w-3 text-destructive" />
      )}
    </div>
  );
} 