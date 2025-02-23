'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useHotkeys } from '@/hooks/useHotkeys';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface Message {
  id: string;
  content: string;
  highlight: string;
  rank: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
  thread?: {
    id: string;
    name: string;
  };
}

interface SearchResponse {
  messages: Message[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

interface MessageSearchProps {
  threadId?: string;
  onMessageSelect?: (messageId: string) => void;
  onClose?: () => void;
}

export function MessageSearch({ threadId, onMessageSelect, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Keyboard shortcuts
  useHotkeys('esc', () => {
    onClose?.();
  });

  useHotkeys('cmd+k', (e) => {
    e.preventDefault();
    inputRef.current?.focus();
  });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isLoading, isError, error } = useQuery<SearchResponse>({
    queryKey: ['messageSearch', debouncedQuery, page, threadId],
    queryFn: async () => {
      if (!debouncedQuery) return { messages: [], pagination: { total: 0, pages: 0, page: 1, limit: 10 } };
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: page.toString(),
        ...(threadId && { threadId }),
      });
      const response = await fetch(`/api/messages/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: Boolean(debouncedQuery),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && data?.messages[0]) {
      onMessageSelect?.(data.messages[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] w-full max-w-lg bg-background border rounded-lg shadow-lg">
      <div className="flex items-center gap-2 p-4 border-b">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuery('')}
            className="h-5 w-5 p-0"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="space-y-4 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Failed to search messages'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['messageSearch'] })}
              className="mt-2"
            >
              Try again
            </Button>
          </div>
        ) : data?.messages.length === 0 && query ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-sm text-muted-foreground">No messages found</p>
          </div>
        ) : (
          <div className="space-y-4 p-2">
            {data?.messages.map((message) => (
              <button
                key={message.id}
                onClick={() => onMessageSelect?.(message.id)}
                className={cn(
                  'flex items-start gap-2 w-full p-2 rounded-lg text-left hover:bg-muted/50 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{message.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: message.highlight }}
                  />
                  {message.thread && (
                    <p className="text-xs text-muted-foreground mt-1">
                      in {message.thread.name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {data?.pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.pagination.pages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === data.pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
} 