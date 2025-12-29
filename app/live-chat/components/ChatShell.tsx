'use client';

import { ReactNode } from 'react';

interface ChatShellProps {
  children: ReactNode;
  connected: boolean;
  participants?: string[];
  tutorJoined?: boolean;
}

export default function ChatShell({
  children,
  connected,
}: ChatShellProps) {
  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-white">
      {!connected && (
        <div className="text-xs text-neutral-400 p-2">
          Connecting…
        </div>
      )}
      {children}
    </div>
  );
}
