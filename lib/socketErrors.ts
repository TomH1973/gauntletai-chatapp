import { Socket } from 'socket.io';
import { ErrorEvent } from '@/types/socket';

export enum SocketErrorCode {
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  THREAD_ACCESS_DENIED = 'THREAD_ACCESS_DENIED',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export const handleSocketError = (socket: Socket, error: Error): void => {
  console.error('Socket error:', error);

  const errorEvent: ErrorEvent = {
    code: SocketErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred'
  };

  if (error instanceof Error) {
    switch (error.name) {
      case 'PrismaClientKnownRequestError':
        errorEvent.code = SocketErrorCode.DATABASE_ERROR;
        errorEvent.message = 'Database operation failed';
        break;
      case 'ValidationError':
        errorEvent.code = SocketErrorCode.INVALID_INPUT;
        errorEvent.message = error.message;
        break;
      case 'AuthenticationError':
        errorEvent.code = SocketErrorCode.AUTHENTICATION_REQUIRED;
        errorEvent.message = 'Authentication required';
        break;
      default:
        errorEvent.message = error.message;
    }
  }

  socket.emit('error', errorEvent);
}; 