import { Socket } from 'socket.io';
import { logger } from './logger';

export enum SocketErrorCode {
  RATE_LIMITED = 'RATE_LIMITED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_INPUT = 'INVALID_INPUT',
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DELIVERY_FAILED = 'DELIVERY_FAILED'
}

export class SocketError extends Error {
  constructor(
    public code: SocketErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'SocketError';
  }
}

export const handleSocketError = (socket: Socket, error: Error) => {
  const isSocketError = error instanceof SocketError;
  const errorCode = isSocketError ? error.code : SocketErrorCode.SERVER_ERROR;
  const errorMessage = isSocketError ? error.message : 'An unexpected error occurred';
  
  logger.error('Socket error:', {
    userId: socket.data?.user?.id,
    errorCode,
    message: error.message,
    stack: error.stack,
    data: isSocketError ? error.data : undefined
  });

  socket.emit('error', {
    code: errorCode,
    message: errorMessage,
    data: isSocketError ? error.data : undefined
  });
};

export const throwSocketError = (code: SocketErrorCode, message: string, data?: any): never => {
  throw new SocketError(code, message, data);
}; 