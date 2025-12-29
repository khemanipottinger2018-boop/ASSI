'use client';

import { useState } from 'react';

type Props = {
  onSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = 'Type a message…',
}: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (disabled) return;
    if (!value.trim()) return;

    onSend(value);
    setValue('');
    onTypingStop();
  };

  return (
    <div className="border-t p-3 flex gap-2">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          setValue(e.target.value);
          onTypingStart();
        }}
        onBlur={onTypingStop}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-md border bg-background text-sm disabled:opacity-50"
      />

      <button
        onClick={handleSend}
        disabled={disabled}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
