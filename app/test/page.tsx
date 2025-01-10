'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';

const testThread = {
    id: 'test-thread',
    title: 'Test Chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: null
};

const testUser = {
    id: 'current-user',
    name: 'Current User',
    email: 'test@example.com',
    image: 'https://via.placeholder.com/40'
};

const testUsers = {
    'current-user': testUser,
    'other-user': {
        id: 'other-user',
        name: 'Other User',
        email: 'other@example.com',
        image: 'https://via.placeholder.com/40'
    }
};

const testMessages = [
    {
        id: '1',
        content: 'Hello, this is a test message',
        userId: 'other-user',
        threadId: 'test-thread',
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5),
        status: 'delivered' as const,
        isEdited: false
    },
    {
        id: '2',
        content: 'This is a reply from the current user',
        userId: 'current-user',
        threadId: 'test-thread',
        createdAt: new Date(Date.now() - 1000 * 60),
        updatedAt: new Date(Date.now() - 1000 * 60),
        status: 'delivered' as const,
        isEdited: false
    }
];

export default function TestPage() {
    return (
        <div className="h-screen p-4">
            <ChatInterface
                thread={testThread}
                currentUser={testUser}
                users={testUsers}
                initialMessages={testMessages}
            />
        </div>
    );
} 