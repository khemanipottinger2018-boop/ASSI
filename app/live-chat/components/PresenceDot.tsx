'use client';

interface PresenceDotProps {
  online?: boolean;
  size?: 'sm' | 'md';
}

export default function PresenceDot({
  online = false,
  size = 'sm',
}: PresenceDotProps) {
  const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span
      className={`
        inline-block rounded-full
        ${sizeClass}
        ${online ? 'bg-emerald-400' : 'bg-neutral-600'}
      `}
    />
  );
}
