'use client';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export default function EmptyState({
  title = 'You’re in a quiet space',
  description = 'Ask anything when you’re ready.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h2 className="text-sm font-medium text-neutral-200 mb-2">
        {title}
      </h2>
      <p className="text-xs text-neutral-500 max-w-sm">
        {description}
      </p>
    </div>
  );
}
