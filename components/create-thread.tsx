import { useState, FormEvent } from 'react';
import type { User } from '../types';

interface CreateThreadProps {
  onThreadCreated?: (threadId: string) => void;
  availableUsers: User[];
}

export function CreateThread({ onThreadCreated, availableUsers }: CreateThreadProps) {
  const [title, setTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || selectedUsers.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/threads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          participantIds: selectedUsers
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const thread = await response.json();
      setTitle('');
      setSelectedUsers([]);
      onThreadCreated?.(thread.id);
    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Failed to create thread. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-white rounded-lg shadow">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Thread Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter thread title..."
          className="mt-1 w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Select Participants
        </label>
        <div className="mt-1 max-h-48 overflow-y-auto border rounded">
          {availableUsers.map(user => (
            <label
              key={user.id}
              className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={(e) => {
                  setSelectedUsers(prev =>
                    e.target.checked
                      ? [...prev, user.id]
                      : prev.filter(id => id !== user.id)
                  );
                }}
                className="h-4 w-4 text-blue-500 rounded"
                disabled={isSubmitting}
              />
              <span className="ml-2">{user.username}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!title.trim() || selectedUsers.length === 0 || isSubmitting}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating...' : 'Create Thread'}
      </button>
    </form>
  );
} 