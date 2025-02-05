import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageList } from '@/components/chat/MessageList';
import { mockMessages } from '../fixtures/messages';
import { mockUsers } from '../fixtures/users';
import { server } from '../mocks/server';
import { rest } from 'msw';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUsers[0],
    isLoading: false,
  }),
}));

describe('MessageList', () => {
  const defaultProps = {
    threadId: 'thread-1',
    messages: mockMessages.filter(msg => msg.threadId === 'thread-1'),
    currentUserId: mockUsers[0].id,
    onReply: jest.fn(),
    onRetry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<MessageList {...defaultProps} isLoading={true} error={null} />);
    expect(screen.getByTestId('message-list-loading')).toBeInTheDocument();
  });

  it('renders messages when loaded', async () => {
    render(<MessageList {...defaultProps} isLoading={false} error={null} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('message-list-loading')).not.toBeInTheDocument();
    });

    // Check if messages are rendered
    defaultProps.messages.forEach(msg => {
      expect(screen.getByText(msg.content)).toBeInTheDocument();
    });
  });

  it('handles message reactions', async () => {
    const user = userEvent.setup();
    render(<MessageList {...defaultProps} isLoading={false} error={null} />);

    await waitFor(() => {
      expect(screen.queryByTestId('message-list-loading')).not.toBeInTheDocument();
    });

    // Find and click reaction button
    const reactionButton = screen.getAllByTestId('message-reaction-button')[0];
    await user.click(reactionButton);

    // Check if reaction picker is shown
    expect(screen.getByTestId('reaction-picker')).toBeInTheDocument();
  });

  it('handles message reply', async () => {
    const user = userEvent.setup();
    render(<MessageList {...defaultProps} isLoading={false} error={null} />);

    await waitFor(() => {
      expect(screen.queryByTestId('message-list-loading')).not.toBeInTheDocument();
    });

    // Find and click reply button
    const replyButton = screen.getAllByTestId('message-reply-button')[0];
    await user.click(replyButton);

    // Check if onReply was called with correct message
    expect(defaultProps.onReply).toHaveBeenCalledWith(defaultProps.messages[0]);
  });

  it('shows error state and allows retry', async () => {
    const error = new Error('Failed to load messages');
    render(<MessageList {...defaultProps} isLoading={false} error={error} />);

    // Check if error message is shown
    expect(screen.getByTestId('message-list-error')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load messages/i)).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    // Check if onRetry was called
    expect(defaultProps.onRetry).toHaveBeenCalled();
  });
}); 