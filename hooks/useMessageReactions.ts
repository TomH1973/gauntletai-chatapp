import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import type { MessageReaction } from '@/types/chat';
import { useAuth } from '@/contexts/auth-context';

interface UseMessageReactionsProps {
  messageId: string;
}

export function useMessageReactions({ messageId }: UseMessageReactionsProps) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const { data: reactions = [], isLoading } = useQuery<MessageReaction[]>({
    queryKey: ['messages', messageId, 'reactions'],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${messageId}/reactions`);
      if (!response.ok) {
        throw new Error('Failed to fetch reactions');
      }
      return response.json();
    },
  });

  const addReaction = useMutation({
    mutationFn: async (emoji: string) => {
      socket?.emit('message:react', { messageId, emoji });
    },
    onMutate: async (emoji) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', messageId, 'reactions'] });

      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData<MessageReaction[]>([
        'messages',
        messageId,
        'reactions',
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData<MessageReaction[]>(
        ['messages', messageId, 'reactions'],
        (old = []) => {
          const existingReaction = old.find((r) => r.emoji === emoji);
          if (existingReaction) {
            if (existingReaction.users.includes(userId)) {
              // User already reacted, remove their reaction
              const updatedUsers = existingReaction.users.filter(id => id !== userId);
              if (updatedUsers.length === 0) {
                return old.filter(r => r.emoji !== emoji);
              }
              return old.map(r =>
                r.emoji === emoji
                  ? { ...r, users: updatedUsers, count: updatedUsers.length }
                  : r
              );
            }
            // Add user's reaction
            return old.map(r =>
              r.emoji === emoji
                ? {
                    ...r,
                    users: [...r.users, userId],
                    count: r.count + 1
                  }
                : r
            );
          }
          // Create new reaction
          return [...old, { emoji, users: [userId], count: 1 }];
        }
      );

      // Return a context object with the snapshotted value
      return { previousReactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousReactions) {
        queryClient.setQueryData(
          ['messages', messageId, 'reactions'],
          context.previousReactions
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', messageId, 'reactions'] });
    },
  });

  const removeReaction = useMutation({
    mutationFn: async (emoji: string) => {
      socket?.emit('message:react', { messageId, emoji });
    },
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey: ['messages', messageId, 'reactions'] });

      const previousReactions = queryClient.getQueryData<MessageReaction[]>([
        'messages',
        messageId,
        'reactions',
      ]);

      queryClient.setQueryData<MessageReaction[]>(
        ['messages', messageId, 'reactions'],
        (old = []) => {
          return old.map((r) =>
            r.emoji === emoji
              ? { ...r, count: Math.max(0, r.count - 1) }
              : r
          ).filter((r) => r.count > 0);
        }
      );

      return { previousReactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousReactions) {
        queryClient.setQueryData(
          ['messages', messageId, 'reactions'],
          context.previousReactions
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', messageId, 'reactions'] });
    },
  });

  return {
    reactions,
    isLoading,
    addReaction: addReaction.mutate,
    removeReaction: removeReaction.mutate,
  };
} 