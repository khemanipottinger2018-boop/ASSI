'use client';

interface TypingIndicatorProps {
  visible: boolean;
}

export default function TypingIndicator({
  visible,
}: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="text-xs text-neutral-500 italic px-6 py-1">
      Typing…
    </div>
  );
}
