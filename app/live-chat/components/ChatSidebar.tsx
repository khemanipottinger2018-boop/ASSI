'use client';

import { ReactNode } from 'react';

interface ChatSidebarProps {
  children?: ReactNode;
}

export default function ChatSidebar({
  children,
}: ChatSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 border-l border-neutral-800 bg-neutral-950">
      <div className="flex-1 p-4 text-sm text-neutral-400">
        {children ?? 'Session details'}
      </div>
    </aside>
  );
}
