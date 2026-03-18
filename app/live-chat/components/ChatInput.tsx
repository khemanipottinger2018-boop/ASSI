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
  placeholder = 'Ask anything. Take your time.',
}: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setValue('');
    onTypingStop();
  };

  return (
    <div className="px-6 py-4 border-t border-neutral-800">
      <div className="flex items-center gap-3 bg-neutral-900/70 rounded-xl px-4 py-3">
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            setValue(e.target.value);
            onTypingStart();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          onBlur={onTypingStop}
          placeholder={placeholder}
          className="
            flex-1 bg-transparent text-sm text-neutral-100
            placeholder:text-neutral-500
            focus:outline-none
            disabled:opacity-50
          "
        />

        <button
          onClick={handleSend}
          disabled={disabled}
          className="
            text-sm px-4 py-2 rounded-lg
            bg-neutral-800 text-neutral-200
            hover:bg-neutral-700
            disabled:opacity-40
            transition
          "
        >
          Send
        </button>
      </div>
    </div>
  );
}