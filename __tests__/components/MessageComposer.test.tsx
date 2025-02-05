import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { mockUsers } from '../fixtures/users';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUsers[0],
    isLoading: false,
  }),
}));

describe('MessageComposer', () => {
  const defaultProps = {
    threadId: 'thread-1',
    onSendMessage: jest.fn(),
    onTypingStart: jest.fn(),
    onTypingStop: jest.fn(),
    disabled: false,
    maxLength: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<MessageComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('handles text input', async () => {
    const user = userEvent.setup();
    render(<MessageComposer {...defaultProps} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, 'Hello world');

    expect(input).toHaveDisplayValue('Hello world');
    expect(defaultProps.onTypingStart).toHaveBeenCalled();
  });

  it('handles message sending', async () => {
    const user = userEvent.setup();
    render(<MessageComposer {...defaultProps} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, 'Hello world');
    
    const sendButton = screen.getByTestId('send-button');
    await user.click(sendButton);

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith({
      content: 'Hello world',
      threadId: 'thread-1',
    });
    expect(input).toHaveDisplayValue('');
  });

  it('handles file attachments', async () => {
    const user = userEvent.setup();
    render(<MessageComposer {...defaultProps} />);

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, file);

    expect(screen.getByText('hello.txt')).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<MessageComposer {...defaultProps} disabled={true} />);
    
    expect(screen.getByPlaceholderText(/type a message/i)).toBeDisabled();
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });

  it('shows error when message is too long', async () => {
    const user = userEvent.setup();
    render(<MessageComposer {...defaultProps} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, 'a'.repeat(5001));
    
    const sendButton = screen.getByTestId('send-button');
    await user.click(sendButton);

    expect(screen.getByText(/message is too long/i)).toBeInTheDocument();
    expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
  });
}); 