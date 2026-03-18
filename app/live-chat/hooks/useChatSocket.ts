'use client';

/**
 * useChatSocket
 *
 * Previously opened its own module-level Socket.IO connection with
 * autoConnect:true and no auth awareness. That meant every user on
 * the chat page had TWO active connections: one from useSocket
 * (notifications/presence) and one from here.
 *
 * Now it's a thin re-export of useSocket. One connection, one auth
 * lifecycle, one Redis pub/sub channel per user. All existing
 * consumers (useChatRoom, useChatMessages, useTyping, the views)
 * are unaffected — the return shape is identical.
 */

import { useSocket } from '@/hooks/useSocket';

export function useChatSocket() {
  return useSocket();
}
