'use client';

/**
 * useChatSocket
 *
 * Delegates to the SocketContext that is already established at the
 * root layout (SocketProvider wraps the entire app). This guarantees
 * exactly ONE socket connection per user session regardless of how
 * many components call useChatSocket() — useChatMessages, useTyping,
 * useChatRoom, and every view all share the same underlying socket.
 *
 * Previously called useSocket() directly, which instantiated a NEW
 * Socket.IO client per caller — causing N connections per page.
 */

import { useSocketContext } from '@/features/socket';

export function useChatSocket() {
  return useSocketContext();
}
