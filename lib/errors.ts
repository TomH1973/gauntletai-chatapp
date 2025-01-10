export enum ErrorCode {
  // Connection Errors
  CONNECTION_FAILED = 'connection_failed',
  CONNECTION_LOST = 'connection_lost',
  
  // Authentication Errors
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  
  // Message Errors
  MESSAGE_SEND_FAILED = 'message_send_failed',
  MESSAGE_VALIDATION_FAILED = 'message_validation_failed',
  MESSAGE_NOT_FOUND = 'message_not_found',
  MESSAGE_DELETE_FAILED = 'message_delete_failed',
  
  // Thread Errors
  THREAD_NOT_FOUND = 'thread_not_found',
  THREAD_ACCESS_DENIED = 'thread_access_denied',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // General Errors
  INVALID_INPUT = 'invalid_input',
  SERVER_ERROR = 'server_error',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  action?: string;
  technical?: string;
}

export const ERROR_MESSAGES: Record<ErrorCode, ErrorDetails> = {
  [ErrorCode.CONNECTION_FAILED]: {
    code: ErrorCode.CONNECTION_FAILED,
    message: "Unable to connect to chat server",
    action: "Please check your internet connection and try again",
    technical: "WebSocket connection failed"
  },
  [ErrorCode.CONNECTION_LOST]: {
    code: ErrorCode.CONNECTION_LOST,
    message: "Lost connection to chat server",
    action: "Attempting to reconnect...",
    technical: "WebSocket connection lost"
  },
  [ErrorCode.UNAUTHORIZED]: {
    code: ErrorCode.UNAUTHORIZED,
    message: "You need to be signed in",
    action: "Please sign in to continue",
    technical: "Authentication token missing or invalid"
  },
  [ErrorCode.FORBIDDEN]: {
    code: ErrorCode.FORBIDDEN,
    message: "You don't have permission to perform this action",
    action: "Contact an administrator if you need access",
    technical: "User lacks required permissions"
  },
  [ErrorCode.MESSAGE_SEND_FAILED]: {
    code: ErrorCode.MESSAGE_SEND_FAILED,
    message: "Failed to send message",
    action: "Please try again",
    technical: "Message creation failed"
  },
  [ErrorCode.MESSAGE_VALIDATION_FAILED]: {
    code: ErrorCode.MESSAGE_VALIDATION_FAILED,
    message: "Invalid message content",
    action: "Please check your message and try again",
    technical: "Message validation failed"
  },
  [ErrorCode.MESSAGE_NOT_FOUND]: {
    code: ErrorCode.MESSAGE_NOT_FOUND,
    message: "Message not found",
    action: "The message may have been deleted",
    technical: "Message ID not found in database"
  },
  [ErrorCode.MESSAGE_DELETE_FAILED]: {
    code: ErrorCode.MESSAGE_DELETE_FAILED,
    message: "Failed to delete message",
    action: "Please try again",
    technical: "Message deletion failed"
  },
  [ErrorCode.THREAD_NOT_FOUND]: {
    code: ErrorCode.THREAD_NOT_FOUND,
    message: "Conversation not found",
    action: "The conversation may have been deleted",
    technical: "Thread ID not found in database"
  },
  [ErrorCode.THREAD_ACCESS_DENIED]: {
    code: ErrorCode.THREAD_ACCESS_DENIED,
    message: "You don't have access to this conversation",
    action: "Ask a participant to add you to the conversation",
    technical: "User not in thread participants"
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: "You're sending messages too quickly",
    action: "Please wait a moment before sending more messages",
    technical: "Rate limit exceeded"
  },
  [ErrorCode.INVALID_INPUT]: {
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid input provided",
    action: "Please check your input and try again",
    technical: "Input validation failed"
  },
  [ErrorCode.SERVER_ERROR]: {
    code: ErrorCode.SERVER_ERROR,
    message: "Something went wrong",
    action: "Please try again later",
    technical: "Internal server error"
  },
}; 