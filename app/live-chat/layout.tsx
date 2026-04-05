'use client';

import { ReactNode } from 'react';

export default function LiveChatLayout({ children }: { children: ReactNode }) {
  return (
    <section className="relative flex flex-col w-full h-full overflow-hidden">
      {children}
    </section>
  );
}
