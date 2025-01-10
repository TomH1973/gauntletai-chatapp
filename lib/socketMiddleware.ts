import { Socket } from 'socket.io';
import { prisma } from './prisma';
import { logger } from './logger';
import { SocketError, SocketErrorCode, throwSocketError } from './socketErrors';
import { AuthenticatedSocket } from './socketTypes';

export const authenticateSocket = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new SocketError(SocketErrorCode.UNAUTHORIZED, 'No userId provided'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (!user) {
      return next(new SocketError(SocketErrorCode.UNAUTHORIZED, 'User not found'));
    }

    // Attach user data to socket
    (socket as AuthenticatedSocket).data = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };

    logger.debug('Socket authenticated', { userId });
    next();
  } catch (error) {
    logger.error('Socket authentication error', error);
    next(new SocketError(SocketErrorCode.SERVER_ERROR, 'Authentication failed'));
  }
}; 