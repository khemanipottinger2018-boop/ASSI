'use client';

import { ReactNode } from 'react';

interface ChatShellProps {
  children: ReactNode;
  connected: boolean;
  header?: ReactNode;
}

export default function ChatShell({
  children,
  connected,
  header,
}: ChatShellProps) {
  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100">
      {/* Session header */}
      {header && (
        <div className="shrink-0">
          {header}
        </div>
      )}

      {/* Connection fallback (subtle, not alarming) */}
      {!connected && (
        <div className="text-xs text-neutral-500 px-6 py-2">
          Reconnecting…
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
