'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LiveChatPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Temporary: generate a simple session id
      const chatId = crypto.randomUUID();
      router.replace(`/live-chat/${chatId}`);
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        Please sign in to start a chat.
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      Starting chat…
    </div>
  );
}
