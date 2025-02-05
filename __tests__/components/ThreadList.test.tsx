import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadList } from '@/components/chat/ThreadList';
import { mockThreads } from '../fixtures/threads';
import { mockUsers } from '../fixtures/users';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUsers[0],
    isLoading: false,
  }),
}));

// Mock the usePresence hook
jest.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({
    onlineUsers: [mockUsers[0].id],
    lastSeen: {
      [mockUsers[1].id]: new Date().toISOString(),
    },
  }),
}));

describe('ThreadList', () => {
  const defaultProps = {
    threads: mockThreads,
    selectedThreadId: null,
    onThreadSelect: jest.fn(),
    currentUser: mockUsers[0],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ThreadList {...defaultProps} />);
    
    // Check if threads are rendered
    mockThreads.forEach(thread => {
      expect(screen.getByText(thread.title)).toBeInTheDocument();
    });
  });

  it('handles thread selection', async () => {
    const user = userEvent.setup();
    render(<ThreadList {...defaultProps} />);

    const threadItem = screen.getByText(mockThreads[0].title).closest('button');
    await user.click(threadItem!);

    expect(defaultProps.onThreadSelect).toHaveBeenCalledWith(mockThreads[0].id);
  });

  it('shows selected thread as active', () => {
    render(<ThreadList {...defaultProps} selectedThreadId={mockThreads[0].id} />);
    
    const selectedThread = screen.getByText(mockThreads[0].title).closest('button');
    expect(selectedThread).toHaveAttribute('aria-selected', 'true');
  });

  it('shows online status for participants', () => {
    render(<ThreadList {...defaultProps} />);
    
    // First user should be shown as online
    expect(screen.getByTestId(`user-status-${mockUsers[0].id}`)).toHaveAttribute('data-online', 'true');
    
    // Second user should be shown as offline with last seen time
    const lastSeenStatus = screen.getByTestId(`user-status-${mockUsers[1].id}`);
    expect(lastSeenStatus).toHaveAttribute('data-online', 'false');
    expect(lastSeenStatus).toHaveAttribute('title', expect.stringContaining('Last seen'));
  });

  it('shows empty state when no threads', () => {
    render(<ThreadList {...defaultProps} threads={[]} />);
    expect(screen.getByText(/no threads yet/i)).toBeInTheDocument();
  });

  it('shows unread indicator for threads with unread messages', () => {
    const threadsWithUnread = mockThreads.map((thread, index) => ({
      ...thread,
      unreadCount: index === 0 ? 3 : 0,
    }));

    render(<ThreadList {...defaultProps} threads={threadsWithUnread} />);
    
    const unreadBadge = screen.getByTestId(`unread-badge-${threadsWithUnread[0].id}`);
    expect(unreadBadge).toBeInTheDocument();
    expect(unreadBadge).toHaveTextContent('3');
  });
}); 