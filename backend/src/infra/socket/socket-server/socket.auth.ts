import { Socket } from 'socket.io';
import { authService } from '@/core/auth/auth.service';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  role: string;
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const decoded = authService.verifyAccessToken(token);
    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }

    // 🔐 Attach identity to socket (authoritative, immutable)
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = decoded.id;
    authSocket.role = decoded.role;

    return next();
  } catch (err) {
    return next(new Error('Socket authentication failed'));
  }
}
