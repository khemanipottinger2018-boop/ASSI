'use client';

import { useAuth } from '@/contexts/AuthContext';

import ChatShell from '../components/ChatShell';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/ChatInput';

import { useChatSocket } from '../hooks/useChatSocket';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTyping } from '../hooks/useTyping';

export default function StudentChatView() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        Not authenticated
      </div>
    );
  }

  const chatId = 'demo-session';
  const currentUserId = user.id;

  /* -------------------------------------------
   * SOCKET
   * ------------------------------------------- */
  const { socket } = useChatSocket();
  const connected = Boolean(socket?.connected);

  /* -------------------------------------------
   * MESSAGES
   * ------------------------------------------- */
  const { messages, sendMessage } = useChatMessages({
    chatId,
  });

  /* -------------------------------------------
   * TYPING
   * ------------------------------------------- */
  const { typingUsers, startTyping, stopTyping } = useTyping({
    chatId,
    currentUserId,
  });

  return (
    <ChatShell connected={connected}>
      <ChatMessages
        messages={messages}
        typingUsers={typingUsers}
        currentUserId={currentUserId}
      />

      <ChatInput
        onSend={sendMessage}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
      />
    </ChatShell>
  );
}
