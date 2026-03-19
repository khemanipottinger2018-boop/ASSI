'use client';

import { use, useEffect } from 'react';
import { useRouter }      from 'next/navigation';
import { Loader2 }        from 'lucide-react';
import { useAuth }        from '@/contexts/AuthContext';
import { StudentChatView }  from '../views/StudentChatView';
import { TutorChatView }    from '../views/TutorChatView';
import { AdminMonitorView } from '../views/AdminMonitorView';

interface Props {
  params: Promise<{ chatId: string }>;
}

export default function ChatRoomPage({ params }: Props) {
  const { chatId } = use(params);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // router.replace must be in useEffect — calling it during render
  // causes a React warning and may cause double-renders in Strict Mode
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/signin');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect is in flight via useEffect — render nothing to avoid flash
    return null;
  }

  if (user.role === 'student') {
    return (
      <StudentChatView
        sessionId={chatId}
        currentUserId={user.id}
        currentUsername={user.username}
      />
    );
  }

  if (user.role === 'tutor') {
    return (
      <TutorChatView
        sessionId={chatId}
        currentUserId={user.id}
        currentUsername={user.username}
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminMonitorView sessionId={chatId} />;
  }

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-white/50 text-sm">Unrecognized role.</p>
    </div>
  );
}