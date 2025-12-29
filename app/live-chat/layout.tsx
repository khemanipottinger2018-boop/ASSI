'use client';

import { ReactNode } from 'react';

export default function LiveChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
    </div>
  );
}
