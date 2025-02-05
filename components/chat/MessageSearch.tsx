'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageSearchProps {
  threadId?: string;
  onMessageSelect?: (messageId: string) => void;
}

export function MessageSearch({ threadId, onMessageSelect }: MessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['messageSearch', debouncedQuery, threadId, page],
    queryFn: async () => {
      if (!debouncedQuery) return null;
      
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: page.toString(),
        ...(threadId && { threadId })
      });

      const response = await fetch(`/api/messages/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: Boolean(debouncedQuery)
  });

  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (data?.pagination.page < data?.pagination.pages) {
      setPage(prev => prev + 1);
    }
  }, [data?.pagination]);

  return (
    <div className="flex flex-col w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchInput}
          placeholder="Search messages..."
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {isLoading && (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 text-red-500 text-center">
          Failed to search messages
        </div>
      )}

      {data?.messages && (
        <div className="mt-4 space-y-2">
          {data.messages.map((message: any) => (
            <button
              key={message.id}
              onClick={() => onMessageSelect?.(message.id)}
              className={cn(
                'w-full p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors duration-200'
              )}
            >
              <div className="flex items-center gap-2">
                <img
                  src={message.user?.image || '/default-avatar.png'}
                  alt={message.user?.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium">{message.user?.name}</span>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-auto">
                  {Math.round(message.rank * 100)}% match
                </span>
              </div>
              <div 
                className="mt-1 text-sm line-clamp-3"
                dangerouslySetInnerHTML={{ __html: message.highlight }}
              />
              {!threadId && message.thread && (
                <p className="mt-1 text-xs text-gray-500">
                  in {message.thread.name}
                </p>
              )}
            </button>
          ))}

          {data.pagination.page < data.pagination.pages && (
            <button
              onClick={handleLoadMore}
              className="w-full py-2 text-sm text-blue-500 hover:text-blue-600"
            >
              Load more results
            </button>
          )}
        </div>
      )}
    </div>
  );
} 