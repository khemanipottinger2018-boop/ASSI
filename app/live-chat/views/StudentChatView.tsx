'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import ChatShell from '../components/ChatShell';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/ChatInput';

import { useChatSocket } from '../hooks/useChatSocket';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTyping } from '../hooks/useTyping';

export default function StudentChatView({ chatId }: { chatId: string }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        Not authenticated
      </div>
    );
  }

  const currentUserId = user.id;

  /* -------------------------------------------
   * SOCKET
   * ------------------------------------------- */
  const { socket } = useChatSocket();
  const connected = Boolean(socket?.connected);

  /* -------------------------------------------
   * LOCAL STATE
   * ------------------------------------------- */
  const [participants, setParticipants] = useState<string[]>([]);
  const [tutorJoined, setTutorJoined] = useState(false);

  /* -------------------------------------------
   * JOIN / LEAVE CHAT
   * ------------------------------------------- */
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('chat:join', chatId);

    return () => {
      socket.emit('chat:leave', chatId);
    };
  }, [socket, connected, chatId]);

  /* -------------------------------------------
   * PRESENCE + TUTOR EVENTS
   * ------------------------------------------- */
  useEffect(() => {
    if (!socket) return;

    const onPresence = (payload: {
      chatId: string;
      participants: string[];
    }) => {
      if (payload.chatId === chatId) {
        setParticipants(payload.participants);
      }
    };

    const onTutorJoined = ({ tutorId }: { tutorId: string }) => {
      setTutorJoined(true);
    };

    socket.on('chat:presence', onPresence);
    socket.on('chat:tutor_joined', onTutorJoined);

    return () => {
      socket.off('chat:presence', onPresence);
      socket.off('chat:tutor_joined', onTutorJoined);
    };
  }, [socket, chatId]);

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
    <ChatShell
      connected={connected}
      participants={participants}
      tutorJoined={tutorJoined}
    >
      <ChatMessages
        messages={messages}
        typingUsers={typingUsers}
        currentUserId={currentUserId}
      />

      <ChatInput
        onSend={sendMessage}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        disabled={!tutorJoined}
        placeholder={
          tutorJoined
            ? 'Type your message…'
            : 'Waiting for a tutor to join…'
        }
      />
    </ChatShell>
  );
}
