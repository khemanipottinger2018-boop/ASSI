'use client';

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: number;
}

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  typingUsers: string[];
}

export default function ChatMessages({
  messages,
  currentUserId,
  typingUsers,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`max-w-[75%] p-2 rounded-md text-sm ${
            msg.senderId === currentUserId
              ? 'ml-auto bg-indigo-600'
              : 'mr-auto bg-neutral-800'
          }`}
        >
          {msg.content}
        </div>
      ))}

      {typingUsers.length > 0 && (
        <div className="text-xs text-neutral-400">
          Someone is typing…
        </div>
      )}
    </div>
  );
}
