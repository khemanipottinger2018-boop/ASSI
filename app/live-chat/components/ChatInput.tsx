'use client';

import { useState } from 'react';

type Props = {
  onSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
};

export default function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
}: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value);
    setValue('');
    onTypingStop();
  };

  return (
    <div className="border-t p-3 flex gap-2">
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onTypingStart();
        }}
        onBlur={onTypingStop}
        placeholder="Type a message…"
        className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
      />

      <button
        onClick={handleSend}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
      >
        Send
      </button>
    </div>
  );
}
