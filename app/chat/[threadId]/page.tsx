import { ChatInterface } from '@/components/chat/ChatInterface';

// Mock data for testing
const mockThread = {
    id: '1',
    title: 'Test Thread',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: null
};

const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://via.placeholder.com/150'
};

const mockUsers = {
    '1': mockUser,
    '2': {
        id: '2',
        name: 'Other User',
        email: 'other@example.com',
        image: 'https://via.placeholder.com/150'
    }
};

const mockMessages = [
    {
        id: '1',
        content: 'Hello World',
        userId: '2',
        threadId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'sent' as const,
        isEdited: false
    }
];

export default function ChatPage() {
    return (
        <div className="h-screen p-4">
            <ChatInterface
                thread={mockThread}
                currentUser={mockUser}
                initialMessages={mockMessages}
                users={mockUsers}
            />
        </div>
    );
} 