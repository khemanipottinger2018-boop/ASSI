'use client';

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  typingUsers: string[];
}

export default function ChatMessages({ messages, currentUserId, typingUsers }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId;

        return (
          <div
            key={msg.messageId}
            className={`max-w-[65%] ${isMe ? 'ml-auto text-right' : 'mr-auto'}`}
          >
            <div
              className={`
                px-4 py-3 rounded-xl text-sm leading-relaxed
                ${isMe ? 'bg-neutral-800/70 text-neutral-100' : 'bg-neutral-900/70 text-neutral-200'}
              `}
            >
              {msg.content}
            </div>

            {/* optional timestamp (safe to remove if you don't want it) */}
            <div className={`mt-1 text-[10px] text-neutral-500 ${isMe ? 'text-right' : ''}`}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="text-xs text-neutral-500 italic px-1">
          Someone is typing…
        </div>
      )}
    </div>
  );
}